<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Notifications\ProjectDecisionNotification;
use App\Services\ProjectVersioning;
use Illuminate\Http\Request;

class AssessorController extends Controller
{
    public function __construct(private ProjectVersioning $versioning) {}

    public function assigned(Request $request)
    {
        return Project::with('members.student')
            ->where('assessor_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get();
    }

    public function show(Request $request, Project $project)
    {
        $this->authorizeAssessor($request, $project);

        return $project->load(self::PROJECT_RELATIONS);
    }

    public function decide(Request $request, Project $project)
    {
        $this->authorizeAssessor($request, $project);

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,refine'],
            'feedback' => ['required_if:decision,refine', 'nullable', 'string'],
            // The actionable checklist the student works through, kept apart
            // from the prose so their page can tick it off item by item.
            'required_changes' => ['sometimes', 'array', 'max:20'],
            'required_changes.*' => ['string', 'max:255'],
        ]);

        if ($project->status !== 'pending') {
            abort(422, 'This project is not awaiting a decision.');
        }

        $project->update([
            'status' => $validated['decision'],
            'feedback' => $validated['decision'] === 'refine' ? $validated['feedback'] : null,
        ]);

        // The decision belongs to the version it was made on. On a revision
        // request that version is kept untouched and a fresh draft opened
        // beside it — the record the comparison is built from.
        $this->versioning->recordDecision(
            $project->fresh(),
            $request->user(),
            $validated['decision'],
            $validated['feedback'] ?? null,
            $validated['required_changes'] ?? [],
        );

        if ($validated['decision'] === 'approved') {
            $this->versioning->advanceToFinalStage($project->fresh());
        }

        foreach ($project->students as $student) {
            $student->notify(new ProjectDecisionNotification($project));
        }

        return response()->json($project->fresh()->load(self::PROJECT_RELATIONS));
    }

    public function notifications(Request $request)
    {
        return $request->user()->notifications()->latest()->limit(100)->get();
    }

    public function markNotificationRead(Request $request, string $notificationId)
    {
        $notification = $request->user()->notifications()->where('id', $notificationId)->firstOrFail();
        $notification->markAsRead();

        return response()->json($notification->fresh());
    }

    private const PROJECT_RELATIONS = [
        'members.student',
        'documents.uploader',
        'versions.submitter',
        'versions.reviewer',
        'versions.documents',
    ];

    private function authorizeAssessor(Request $request, Project $project): void
    {
        if ($project->assessor_id !== $request->user()->id) {
            abort(403, 'This project is not assigned to you.');
        }
    }
}
