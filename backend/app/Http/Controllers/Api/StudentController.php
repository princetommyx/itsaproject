<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    /**
     * The current student's project (as leader or member), if any.
     */
    public function current(Request $request)
    {
        $project = $request->user()->projects()->with(['students', 'assessor'])->first();

        // response()->json(null) serializes to "{}" (Symfony coerces a null
        // top-level payload to an empty object), so wrap it in an envelope
        // to preserve a genuine null when the student has no project yet.
        return response()->json(['project' => $project]);
    }

    /**
     * The group leader creates a project draft.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->projects()->exists()) {
            throw ValidationException::withMessages([
                'project' => ['You already belong to a project group.'],
            ]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
        ]);

        $project = Project::create([
            ...$validated,
            'status' => 'draft',
        ]);

        $project->students()->attach($user->id, ['is_leader' => true]);

        return response()->json($project->load('students'), 201);
    }

    public function update(Request $request, Project $project)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
        ]);

        $project->update($validated);

        return response()->json($project->fresh('students'));
    }

    /**
     * Add a group member by Index Number. Validates in real-time that
     * the index number exists and isn't already attached to a group.
     */
    public function addMember(Request $request, Project $project)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        $validated = $request->validate([
            'university_id' => ['required', 'string'],
        ]);

        $student = User::where('university_id', $validated['university_id'])
            ->where('role', 'student')
            ->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'university_id' => ['No student found with this Index Number.'],
            ]);
        }

        if ($student->projects()->exists()) {
            throw ValidationException::withMessages([
                'university_id' => ['This student is already attached to a group.'],
            ]);
        }

        $project->students()->attach($student->id, ['is_leader' => false]);

        return response()->json($project->fresh('students'));
    }

    public function removeMember(Request $request, Project $project, User $student)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        if ($project->leader()?->id === $student->id) {
            throw ValidationException::withMessages([
                'student' => ['The group leader cannot be removed.'],
            ]);
        }

        $project->students()->detach($student->id);

        return response()->json($project->fresh('students'));
    }

    /**
     * The leader submits the project; status moves to submitted_unassigned.
     */
    public function submit(Request $request, Project $project)
    {
        $this->authorizeLeader($request, $project);

        if (! in_array($project->status, ['draft', 'refine'], true)) {
            throw ValidationException::withMessages([
                'project' => ['This project cannot be submitted from its current status.'],
            ]);
        }

        $project->update([
            'status' => 'submitted_unassigned',
            'assessor_id' => null,
        ]);

        return response()->json($project->fresh('students'));
    }

    private function authorizeLeader(Request $request, Project $project): void
    {
        $isLeader = $project->students()
            ->wherePivot('is_leader', true)
            ->where('users.id', $request->user()->id)
            ->exists();

        if (! $isLeader) {
            abort(403, 'Only the group leader can perform this action.');
        }
    }

    private function ensureEditable(Project $project): void
    {
        if (! in_array($project->status, ['draft', 'refine'], true)) {
            throw ValidationException::withMessages([
                'project' => ['This project can no longer be edited.'],
            ]);
        }
    }
}
