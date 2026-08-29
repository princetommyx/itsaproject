<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\User;
use App\Notifications\DocumentSubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProjectDocumentController extends Controller
{
    /**
     * The group leader uploads a document for their project. Each upload
     * is a new row (not an overwrite), so submission history is kept —
     * the most recent one of a given type is treated as "current".
     */
    public function store(Request $request, Project $project)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:'.implode(',', array_keys(ProjectDocument::TYPES))],
            'file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:20480'],
        ]);

        $file = $request->file('file');
        $path = $file->store("project-documents/{$project->id}", config('filesystems.default'));

        $document = $project->documents()->create([
            'type' => $validated['type'],
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json($document->load('uploader'), 201);
    }

    /**
     * Hands an uploaded document to the admins. Upload and submit are
     * deliberately separate: a group can upload, check they picked the right
     * file, replace it if not, and only then submit. Nothing reaches the
     * admins until this runs.
     */
    public function submit(Request $request, Project $project, ProjectDocument $document)
    {
        $this->authorizeLeader($request, $project);

        if ($document->project_id !== $project->id) {
            abort(404);
        }

        if ($document->submitted_at) {
            throw ValidationException::withMessages([
                'document' => ['This document has already been submitted.'],
            ]);
        }

        $document->update(['submitted_at' => now()]);

        foreach (User::where('role', 'admin')->get() as $admin) {
            $admin->notify(new DocumentSubmittedNotification($document));
        }

        return response()->json($document->fresh()->load('uploader'));
    }

    public function destroy(Request $request, Project $project, ProjectDocument $document)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        if ($document->project_id !== $project->id) {
            abort(404);
        }

        // Removing is the escape hatch for picking the wrong file, so it only
        // applies before submission — once it's with the admins, pulling it
        // back out from under them would defeat the point of the two steps.
        if ($document->submitted_at) {
            throw ValidationException::withMessages([
                'document' => ['This document has already been submitted and can no longer be removed.'],
            ]);
        }

        Storage::disk(config('filesystems.default'))->delete($document->stored_path);
        $document->delete();

        return response()->json(['message' => 'Document removed.']);
    }

    /**
     * Streamed, permission-checked download — available to the student
     * who owns the project, the assigned assessor, or any admin.
     */
    public function download(Request $request, ProjectDocument $document)
    {
        $user = $request->user();
        $project = $document->project;

        $canAccess = match ($user->role) {
            'admin' => true,
            'assessor' => $project->assessor_id === $user->id,
            'student' => $project->members()->where('student_id', $user->id)->exists(),
            default => false,
        };

        if (! $canAccess) {
            abort(403, 'You do not have access to this document.');
        }

        $disk = Storage::disk(config('filesystems.default'));

        if (! $disk->exists($document->stored_path)) {
            abort(404, 'This file is no longer available.');
        }

        return $disk->download($document->stored_path, $document->original_filename);
    }

    private function authorizeLeader(Request $request, Project $project): void
    {
        $isLeader = $project->members()
            ->where('student_id', $request->user()->id)
            ->where('is_leader', true)
            ->exists();

        if (! $isLeader) {
            abort(403, 'Only the group leader can perform this action.');
        }
    }

    /**
     * Documents stay uploadable once a project is approved: approval only
     * signs off the topic, and the group's actual write-up (the final
     * report, etc.) is produced and submitted afterward. Only a project
     * still awaiting a decision (submitted_unassigned/pending) is locked.
     */
    private function ensureEditable(Project $project): void
    {
        if (! in_array($project->status, ['draft', 'refine', 'approved'], true)) {
            throw ValidationException::withMessages([
                'project' => ['Documents can only be added or removed while the project is editable.'],
            ]);
        }
    }
}
