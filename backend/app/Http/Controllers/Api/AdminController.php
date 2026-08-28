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
        return response()->json([
            'total_submitted' => Project::where('status', '!=', 'draft')->count(),
            'pending' => Project::where('status', 'pending')->count(),
            'unassigned' => Project::where('status', 'submitted_unassigned')->count(),
            'approved' => Project::where('status', 'approved')->count(),
            'refine' => Project::where('status', 'refine')->count(),
            'total_students' => User::where('role', 'student')->count(),
            'total_assessors' => User::where('role', 'assessor')->count(),
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
        return $project->load(['members.student', 'assessor']);
    }

    /**
     * Admins can approve/refine any pending project, as a backup to the
     * assigned assessor (e.g. if the assessor is unavailable).
     */
    public function decideProject(Request $request, Project $project)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,refine'],
            'feedback' => ['required_if:decision,refine', 'nullable', 'string'],
        ]);

        if ($project->status !== 'pending') {
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
        return LoginLog::with('user:id,name,role,university_id,email')
            ->orderByDesc('login_time')
            ->paginate(50);
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
}
