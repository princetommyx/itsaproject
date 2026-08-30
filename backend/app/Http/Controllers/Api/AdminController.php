<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProjectMappingExport;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\LoginLog;
use App\Models\Project;
use App\Models\User;
use App\Notifications\ProjectDecisionNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class AdminController extends Controller
{
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

    public function showProject(Project $project)
    {
        return $project->load(['members.student', 'assessor', 'documents.uploader']);
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
        ]);

        if (! in_array($project->status, ['pending', 'submitted_unassigned'], true)) {
            abort(422, 'This project is not awaiting a decision.');
        }

        $project->update([
            'status' => $validated['decision'],
            'feedback' => $validated['decision'] === 'refine' ? $validated['feedback'] : null,
        ]);

        foreach ($project->students as $student) {
            $student->notify(new ProjectDecisionNotification($project));
        }

        return response()->json($project->fresh()->load(['members.student', 'assessor']));
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
            ->with('projects:id,title,status')
            ->orderBy('name')
            ->simplePaginate(50, ['id', 'name', 'university_id', 'student_email', 'is_first_login', 'created_at']);
    }

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
     * Export the full Project -> Members -> Assessor mapping.
     */
    public function exportProjects()
    {
        return Excel::download(new ProjectMappingExport, 'project-mapping.xlsx');
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
