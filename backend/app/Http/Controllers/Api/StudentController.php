<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Notifications\ProjectResubmittedNotification;
use App\Notifications\ProjectSubmittedNotification;
use App\Services\ProjectVersioning;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    public function __construct(private ProjectVersioning $versioning) {}

    /**
     * The current student's project (as leader or member), if any.
     */
    public function current(Request $request)
    {
        $project = $request->user()->projects()->with(self::PROJECT_RELATIONS)->first();

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

        $this->versioning->openInitial($project);

        return response()->json($this->projectPayload($project), 201);
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
        // Keep the open draft in step, so the history shows what the student
        // actually has rather than the content the draft was opened with.
        $this->versioning->syncDraft($project->fresh());

        return response()->json($this->projectPayload($project));
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
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $universityId = trim($validated['university_id']);
        $name = trim($validated['name'] ?? '');

        if (ProjectMember::where('university_id', $universityId)->exists()) {
            throw ValidationException::withMessages([
                'university_id' => ['This student is already attached to a group.'],
            ]);
        }

        // Optional rather than required: when the student has already been
        // imported their real name is shown from their account, so asking the
        // group to retype it would be busywork. It matters for the case this
        // was added for — a partner who isn't in the system yet, where the
        // Index Number alone tells you nothing about who they are.
        $project->members()->create([
            'university_id' => $universityId,
            'name' => $name !== '' ? $name : null,
            'student_id' => $this->findLinkedStudentId($universityId),
            'is_leader' => false,
        ]);

        return response()->json($this->projectPayload($project));
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

        return response()->json($this->projectPayload($project));
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

        $isResubmission = $project->status === 'refine';
        $previousAssessor = $isResubmission ? $project->assessor : null;

        // A resubmission goes back to the assessor who asked for it. They are
        // the one who knows what they asked for, and they're the only person
        // the comparison means anything to. Sending it to the unassigned
        // queue instead used to notify them of a version they then couldn't
        // open, because unassigning had just revoked their access to it.
        $project->update($previousAssessor
            ? ['status' => 'pending']
            : ['status' => 'submitted_unassigned', 'assessor_id' => null]);

        $this->versioning->submit($project->fresh(), $request->user());

        if ($previousAssessor) {
            $this->versioning->markUnderReview($project->fresh());
            $previousAssessor->notify(new ProjectResubmittedNotification($project));
        } else {
            foreach (User::where('role', 'admin')->get() as $admin) {
                $admin->notify(new ProjectSubmittedNotification($project));
            }
        }

        return response()->json($this->projectPayload($project));
    }

    /**
     * The student's notifications (newest first), e.g. assessor decisions
     * on their project — including the feedback when sent back for
     * refinement, so they can see it without leaving the notifications
     * page.
     */
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

    /**
     * The shape current() returns. Every mutating endpoint responds with this
     * too, so the client can write the response straight into its cache
     * instead of paying a second round trip to re-read what it just changed —
     * which is the difference between the UI updating instantly and appearing
     * to hang while a slow request completes.
     */
    private function projectPayload(Project $project)
    {
        return $project->fresh()->load(self::PROJECT_RELATIONS);
    }

    /**
     * One list, used by every endpoint that returns a project, so a response
     * the client writes into its cache is never missing a relation the page
     * it lands on needs.
     */
    private const PROJECT_RELATIONS = [
        'members.student',
        'assessor',
        'documents.uploader',
        'versions.submitter',
        'versions.reviewer',
        'versions.documents',
    ];

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
