<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Notifications\ProjectDecisionNotification;
use Illuminate\Http\Request;

class AssessorController extends Controller
{
    public function assigned(Request $request)
    {
        return Project::with('students')
            ->where('assessor_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get();
    }

    public function show(Request $request, Project $project)
    {
        $this->authorizeAssessor($request, $project);

        return $project->load('students');
    }

    public function decide(Request $request, Project $project)
    {
        $this->authorizeAssessor($request, $project);

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

        return response()->json($project->fresh('students'));
    }

    private function authorizeAssessor(Request $request, Project $project): void
    {
        if ($project->assessor_id !== $request->user()->id) {
            abort(403, 'This project is not assigned to you.');
        }
    }
}
