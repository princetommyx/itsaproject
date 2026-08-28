<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMember;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    /**
     * The current student's project (as leader or member), if any.
     */
    public function current(Request $request)
    {
        $project = $request->user()->projects()->with(['members.student', 'assessor'])->first();

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

        $project->members()->create([
            'university_id' => $user->university_id,
            'student_id' => $user->id,
            'is_leader' => true,
        ]);

        return response()->json($project->load('members.student'), 201);
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

        return response()->json($project->fresh()->load('members.student'));
    }

    /**
     * Add a group member by Index Number. The full student roster isn't
     * always imported before groups start forming, so this only checks
     * that the Index Number isn't already claimed by another group — it
     * does NOT require the student to already have an account. If that
     * student is later imported via CSV, their entry links up
     * automatically at that point (see AdminController::importStudents).
     */
    public function addMember(Request $request, Project $project)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        $validated = $request->validate([
            'university_id' => ['required', 'string', 'max:255'],
        ]);

        $universityId = trim($validated['university_id']);

        if (ProjectMember::where('university_id', $universityId)->exists()) {
            throw ValidationException::withMessages([
                'university_id' => ['This student is already attached to a group.'],
            ]);
        }

        $project->members()->create([
            'university_id' => $universityId,
            'student_id' => $this->findLinkedStudentId($universityId),
            'is_leader' => false,
        ]);

        return response()->json($project->fresh()->load('members.student'));
    }

    public function removeMember(Request $request, Project $project, ProjectMember $member)
    {
        $this->authorizeLeader($request, $project);
        $this->ensureEditable($project);

        if ($member->project_id !== $project->id) {
            abort(404);
        }

        if ($member->is_leader) {
            throw ValidationException::withMessages([
                'member' => ['The group leader cannot be removed.'],
            ]);
        }

        $member->delete();

        return response()->json($project->fresh()->load('members.student'));
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

        return response()->json($project->fresh()->load('members.student'));
    }

    /**
     * The student's notifications (newest first), e.g. assessor decisions
     * on their project — including the feedback when sent back for
     * refinement, so they can see it without leaving the notifications
     * page.
     */
    public function notifications(Request $request)
    {
        return $request->user()->notifications()->latest()->get();
    }

    public function markNotificationRead(Request $request, string $notificationId)
    {
        $notification = $request->user()->notifications()->where('id', $notificationId)->firstOrFail();
        $notification->markAsRead();

        return response()->json($notification->fresh());
    }

    private function findLinkedStudentId(string $universityId): ?int
    {
        return \App\Models\User::where('university_id', $universityId)
            ->where('role', 'student')
            ->value('id');
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

    private function ensureEditable(Project $project): void
    {
        if (! in_array($project->status, ['draft', 'refine'], true)) {
            throw ValidationException::withMessages([
                'project' => ['This project can no longer be edited.'],
            ]);
        }
    }
}
