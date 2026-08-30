<?php

use App\Models\Project;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Give every project that predates versioning a version to stand on.
     *
     * Without this, an existing project has an empty history and no current
     * version, so the pages that read one show nothing and a resubmission
     * would number itself v1.0 as though the work already reviewed had never
     * happened. One version is created carrying the project's current
     * content and a status derived from where it had already got to.
     */
    public function up(): void
    {
        $statusMap = [
            'draft' => 'draft',
            'submitted_unassigned' => 'submitted',
            'pending' => 'under_review',
            'approved' => 'approved',
            'refine' => 'revision_required',
        ];

        Project::query()->whereDoesntHave('versions')->chunkById(100, function ($projects) use ($statusMap) {
            foreach ($projects as $project) {
                $status = $statusMap[$project->status] ?? 'draft';

                $versionId = DB::table('project_versions')->insertGetId([
                    'project_id' => $project->id,
                    'stage' => $project->stage ?? 'proposal',
                    'sequence' => 1,
                    'status' => $status,
                    'title' => $project->title,
                    'description' => $project->description,
                    // The original submitter isn't recorded anywhere for these,
                    // so it stays null rather than being guessed at.
                    'submitted_at' => $status === 'draft' ? null : $project->updated_at,
                    'feedback' => $status === 'revision_required' ? $project->feedback : null,
                    'created_at' => $project->created_at,
                    'updated_at' => $project->updated_at,
                ]);

                DB::table('project_documents')
                    ->where('project_id', $project->id)
                    ->whereNull('project_version_id')
                    ->update(['project_version_id' => $versionId]);

                // A project already sent back needs somewhere to revise into,
                // matching what recordDecision() does from now on.
                if ($status === 'revision_required') {
                    DB::table('project_versions')->insert([
                        'project_id' => $project->id,
                        'stage' => $project->stage ?? 'proposal',
                        'sequence' => 2,
                        'status' => 'draft',
                        'title' => $project->title,
                        'description' => $project->description,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        // Intentionally irreversible: rolling back would delete submission
        // history, which is the one thing this feature exists to prevent.
    }
};
