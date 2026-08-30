<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The academic record of a project, one row per submission attempt.
     *
     * Before this, a project sent back for revision was edited in place: the
     * student overwrote the title and description that had been reviewed, and
     * the version the assessor objected to ceased to exist. There was then no
     * way to answer the only question that matters on a resubmission — did
     * they actually address the feedback?
     *
     * Nothing here is ever deleted. Each version snapshots the content as it
     * was submitted, alongside the decision and feedback it drew, so any two
     * versions can be put side by side.
     */
    public function up(): void
    {
        Schema::create('project_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();

            // The two academic stages the platform covers. A project moves
            // from proposal to final work, and each stage keeps its own
            // independent run of versions.
            $table->enum('stage', ['proposal', 'final'])->default('proposal');

            // 1-based within a stage; displayed as v1.0, v1.1, v1.2 …
            $table->unsignedInteger('sequence');

            $table->enum('status', [
                'draft',
                'submitted',
                'under_review',
                'revision_required',
                'approved',
            ])->default('draft');

            // The content as submitted. Snapshotted rather than read through
            // the project, which keeps changing — that is the whole point.
            $table->string('title');
            $table->text('description');

            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();

            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();

            $table->text('feedback')->nullable();

            // The reviewer's actionable list ("Narrow project scope", "Revise
            // Objective 3"), kept apart from the prose feedback so the student
            // page can show it as a checklist.
            $table->json('required_changes')->nullable();

            $table->timestamps();

            // Every list of versions is scoped to one project and stage, in
            // sequence order, and a stage can't have two of the same number.
            $table->unique(['project_id', 'stage', 'sequence']);
            $table->index(['project_id', 'stage', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_versions');
    }
};
