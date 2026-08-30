<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProjectDataExport;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\LoginLog;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Notifications\AddedToGroupNotification;
use App\Notifications\DefenseScheduledNotification;
use App\Notifications\ProjectDecisionNotification;
use App\Services\ProjectVersioning;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

class AdminController extends Controller
{
    public function __construct(private ProjectVersioning $versioning) {}

    /**
     * High-level aggregate stats for the analytics dashboard.
     */
    public function dashboard()
    {
        $projectCounts = Project::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $userCounts = User::selectRaw('role, count(*) as count')
            ->whereIn('role', ['student', 'assessor'])
            ->groupBy('role')
            ->pluck('count', 'role');

        return response()->json([
            'total_submitted' => $projectCounts->except('draft')->sum(),
            'pending' => $projectCounts->get('pending', 0),
            'unassigned' => $projectCounts->get('submitted_unassigned', 0),
            'approved' => $projectCounts->get('approved', 0),
            'refine' => $projectCounts->get('refine', 0),
            'total_students' => $userCounts->get('student', 0),
            'total_assessors' => $userCounts->get('assessor', 0),
        ]);
    }

    /**
     * Admin CSV import: Student Name, Index Number, Email, Date of Birth.
     * Default password is the hashed DOB (YYYYMMDD).
     */
    public function importStudents(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $rows = array_map('str_getcsv', file($request->file('file')->getRealPath()));
        $header = array_map(fn ($h) => strtolower(trim($h)), array_shift($rows));

        $created = [];
        $errors = [];

        foreach ($rows as $index => $row) {
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $data = array_combine($header, $row);

            $name = trim($data['student name'] ?? $data['name'] ?? '');
            $universityId = trim($data['index number'] ?? $data['university_id'] ?? '');
            $email = trim($data['email'] ?? '');
            $dob = trim($data['date of birth'] ?? $data['dob'] ?? '');

            $validator = Validator::make(
                compact('name', 'universityId', 'email', 'dob'),
                [
                    'name' => ['required', 'string'],
                    'universityId' => ['required', 'string', 'unique:users,university_id'],
                    'email' => ['nullable', 'email'],
                    'dob' => ['required', 'date'],
                ]
            );

            if ($validator->fails()) {
                $errors[] = ['row' => $index + 2, 'errors' => $validator->errors()->all()];

                continue;
            }

            $dobCarbon = \Illuminate\Support\Carbon::parse($dob);

            $user = User::create([
                'name' => $name,
                'university_id' => $universityId,
                'student_email' => $email ?: null,
                'dob' => $dobCarbon,
                'role' => 'student',
                'password' => Hash::make($dobCarbon->format('Ymd')),
                'is_first_login' => true,
            ]);

            // Link up any group they were already added to by Index Number
            // before their account existed.
            \App\Models\ProjectMember::where('university_id', $universityId)
                ->whereNull('student_id')
                ->update(['student_id' => $user->id]);

            $created[] = $user->university_id;
        }

        return response()->json([
            'created' => $created,
            'errors' => $errors,
        ]);
    }

    /**
     * All submitted projects, for the admin's oversight/review list.
     */
    public function allProjects()
    {
        return Project::with(['members.student', 'assessor'])
            ->where('status', '!=', 'draft')
            ->orderByDesc('updated_at')
            ->get();
    }

    /**
     * Every group, drafts included, for the "put this student somewhere"
     * picker. allProjects() deliberately hides drafts — it backs the review
     * list, where an unsubmitted project is noise — but a group still short
     * a member is almost always a draft, so hiding them there would hide
     * exactly the groups an admin needs to reach.
     */
    public function groups(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        return Project::with(['members:id,project_id,university_id,name,student_id', 'assessor:id,name'])
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->orderBy('title')
            ->limit(50)
            ->get(['id', 'title', 'status', 'assessor_id']);
    }

    public function showProject(Project $project)
    {
        return $project->load(self::PROJECT_RELATIONS);
    }

    /**
     * Admins can approve/refine any project awaiting a decision — whether
     * it's already assigned to an assessor (as a backup, e.g. if the
     * assessor is unavailable) or still unassigned, so an admin doesn't
     * have to assign someone else just to review it themselves.
     */
    public function decideProject(Request $request, Project $project)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,refine'],
            'feedback' => ['required_if:decision,refine', 'nullable', 'string'],
            'required_changes' => ['sometimes', 'array', 'max:20'],
            'required_changes.*' => ['string', 'max:255'],
        ]);

        if (! in_array($project->status, ['pending', 'submitted_unassigned'], true)) {
            abort(422, 'This project is not awaiting a decision.');
        }

        $project->update([
            'status' => $validated['decision'],
            'feedback' => $validated['decision'] === 'refine' ? $validated['feedback'] : null,
        ]);

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

    /**
     * Projects awaiting assessor assignment.
     */
    public function unassignedProjects()
    {
        return Project::with('members.student')
            ->where('status', 'submitted_unassigned')
            ->get();
    }

    public function assignAssessor(Request $request, Project $project)
    {
        $validated = $request->validate([
            'assessor_id' => ['required', 'exists:users,id'],
        ]);

        $assessor = User::where('id', $validated['assessor_id'])->where('role', 'assessor')->firstOrFail();

        $project->update([
            'assessor_id' => $assessor->id,
            'status' => 'pending',
        ]);

        $assessor->notify(new \App\Notifications\ProjectAssignedNotification($project));

        // The submitted version is now actually being looked at, which is a
        // different thing from sitting in the queue.
        $this->versioning->markUnderReview($project->fresh());

        return response()->json($project->fresh('assessor'));
    }

    public function assessors()
    {
        return User::where('role', 'assessor')->get(['id', 'name', 'email']);
    }

    /**
     * The imported student roster. Eager-loads each student's project so the
     * list can show who is already in a group without a query per row, and
     * takes an optional `search` over name and index number — a roster runs
     * to hundreds of rows, where paging alone is not a way to find anyone.
     */
    public function students(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        return User::where('role', 'student')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('university_id', 'like', "%{$search}%");
                });
            })
            // The students with no group are the ones an admin has to act on,
            // and on a roster of hundreds they're invisible among the rest —
            // so they get their own filter rather than a scroll.
            ->when($request->query('filter') === 'ungrouped', fn ($query) => $query->whereDoesntHave('projects'))
            ->with('projects:id,title,status')
            ->orderBy('name')
            ->simplePaginate(50, ['id', 'name', 'university_id', 'student_email', 'is_first_login', 'created_at']);
    }

    /**
     * One student in full: their account, and the group they belong to with
     * its assessor and fellow members. The roster list deliberately carries
     * only enough to render a row, so this is what backs the detail view.
     */
    public function showStudent(User $student)
    {
        abort_unless($student->role === 'student', 404);

        $student->load(['projects.members.student', 'projects.assessor']);

        return response()->json($student);
    }

    /**
     * Place a student into a group by hand.
     *
     * Groups normally form themselves — a leader adds partners by Index
     * Number. That leaves the students nobody added: they exist on the
     * imported roster with no group and no way to get into one, since only
     * a leader can add members. This is the administrator's way in.
     *
     * The student is notified, because unlike joining through a leader they
     * had no part in this and would otherwise never know.
     */
    public function addProjectMember(Request $request, Project $project)
    {
        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $student = User::where('id', $validated['student_id'])->where('role', 'student')->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'student_id' => ['That account is not a student.'],
            ]);
        }

        // university_id is unique across project_student, so a student can
        // only ever be in one group. Say which one, rather than letting the
        // database reject it with something the admin can't act on.
        $existing = ProjectMember::where('university_id', $student->university_id)->first();

        if ($existing) {
            $title = $existing->project?->title ?? 'another group';

            throw ValidationException::withMessages([
                'student_id' => [$existing->project_id === $project->id
                    ? 'This student is already in this group.'
                    : "This student is already in {$title}."],
            ]);
        }

        $project->members()->create([
            'university_id' => $student->university_id,
            'name' => $student->name,
            'student_id' => $student->id,
            'is_leader' => false,
        ]);

        $student->notify(new AddedToGroupNotification($project));

        return response()->json($this->projectPayload($project));
    }

    /**
     * Undo a placement. An admin who can only add is stuck with their own
     * typos, and the group leader can't remove someone the admin added.
     */
    public function removeProjectMember(Project $project, ProjectMember $member)
    {
        abort_if($member->project_id !== $project->id, 404);

        if ($member->is_leader) {
            throw ValidationException::withMessages([
                'member' => ['The group leader cannot be removed.'],
            ]);
        }

        $member->delete();

        return response()->json($this->projectPayload($project));
    }

    /**
     * Set (or clear) a group's defense dates and tell the group.
     *
     * Both fields are optional and nullable so the proposal defense can be
     * scheduled months before the final one, and a cancelled sitting can be
     * cleared rather than left showing a date that has passed.
     */
    public function setDefenseDates(Request $request, Project $project)
    {
        $validated = $request->validate([
            'proposal_defense_at' => ['nullable', 'date'],
            'final_defense_at' => ['nullable', 'date'],
        ]);

        $project->update([
            'proposal_defense_at' => $validated['proposal_defense_at'] ?? null,
            'final_defense_at' => $validated['final_defense_at'] ?? null,
        ]);

        $project->refresh();

        // Only worth a notification if there is actually a date to announce;
        // clearing both is housekeeping, not news.
        if ($project->proposal_defense_at || $project->final_defense_at) {
            foreach ($project->students as $student) {
                $student->notify(new DefenseScheduledNotification($project));
            }
        }

        return response()->json($this->projectPayload($project));
    }

    /**
     * The shape the admin project views read, so a mutation's response can be
     * written straight into the client cache instead of forcing a re-fetch.
     */
    private function projectPayload(Project $project)
    {
        return $project->fresh()->load(self::PROJECT_RELATIONS);
    }

    private const PROJECT_RELATIONS = [
        'members.student',
        'assessor',
        'documents.uploader',
        'versions.submitter',
        'versions.reviewer',
        'versions.documents',
    ];

    /**
     * Onboard a staff account (assessor or admin) via official email.
     */
    public function createStaff(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', 'in:admin,assessor'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_first_login' => false,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Export the whole picture as a workbook: a Project Groups sheet and a
     * Students sheet, each carrying topic, supervisor, and defense dates.
     */
    public function exportProjects()
    {
        return Excel::download(new ProjectDataExport, 'upsa-project-data.xlsx');
    }

    public function loginLogs()
    {
        // simplePaginate, not paginate: the UI only ever reads the row list
        // (there's no page-number control), so the extra COUNT(*) query
        // paginate() runs just to compute a total nobody displays is a pure
        // round trip to cut — and every round trip counts on this DB link.
        return LoginLog::with('user:id,name,role,university_id,email')
            ->orderByDesc('login_time')
            ->simplePaginate(50);
    }

    public function complaints()
    {
        return Complaint::with('student:id,name,university_id')
            ->orderByDesc('created_at')
            ->get();
    }

    public function updateComplaint(Request $request, Complaint $complaint)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:open,in_progress,resolved'],
        ]);

        $complaint->update($validated);

        return response()->json($complaint);
    }

    /**
     * Measures the real round-trip time to the database, to settle whether
     * slowness is network distance (app server and database in different
     * regions) rather than guesswork. A trivial `SELECT 1` does no work, so
     * whatever it costs is almost entirely network:
     *
     *   under ~10ms  -> same region, look elsewhere for the slowness
     *   ~50-100ms    -> nearby region, some room to improve
     *   over ~150ms  -> different continent; every query in every request
     *                   pays this, which is the thing to fix
     *
     * Reports timings only — never host, credentials, or schema.
     */
    public function diagnostics()
    {
        $samples = [];

        for ($i = 0; $i < 5; $i++) {
            $start = hrtime(true);
            DB::select('select 1');
            $samples[] = (hrtime(true) - $start) / 1_000_000;
        }

        sort($samples);
        $median = $samples[intdiv(count($samples), 2)];

        $verdict = match (true) {
            $median < 10 => 'same_region',
            $median < 100 => 'nearby_region',
            default => 'different_region',
        };

        return response()->json([
            'db_driver' => config('database.default'),
            'query_ms' => [
                'median' => round($median, 1),
                'min' => round($samples[0], 1),
                'max' => round($samples[count($samples) - 1], 1),
            ],
            'verdict' => $verdict,
        ]);
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
}
