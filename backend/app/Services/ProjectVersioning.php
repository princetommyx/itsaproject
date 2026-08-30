<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectVersion;
use App\Models\User;

/**
 * Owns the submission history.
 *
 * Every transition that used to overwrite a project's content now goes
 * through here, so there is exactly one place that decides when a new version
 * is opened and when an existing one is stamped. The rule the whole feature
 * rests on is that no method here ever updates a version that has left the
 * student's hands: a revision is always a new row.
 */
class ProjectVersioning
{
    /**
     * Open the first version of a project's current stage.
     */
    public function openInitial(Project $project): ProjectVersion
    {
        return $this->openDraft($project);
    }

    /**
     * The draft the student is currently working on, if there is one.
     *
     * There isn't always: between a reviewer requesting a revision and the
     * student starting work, the newest version is the one that was sent
     * back, which must never be edited.
     */
    public function openDraftFor(Project $project): ?ProjectVersion
    {
        $current = $project->currentVersion();

        return $current && $current->isEditable() ? $current : null;
    }

    /**
     * Keep the open draft in step with the project's live content, so the
     * history shows what the student actually has rather than a stale
     * snapshot from when the draft was opened.
     */
    public function syncDraft(Project $project): void
    {
        $this->openDraftFor($project)?->update([
            'title' => $project->title,
            'description' => $project->description,
        ]);
    }

    /**
     * Stamp the current draft as submitted, opening one first if the student
     * is resubmitting after a revision request.
     */
    public function submit(Project $project, User $student): ProjectVersion
    {
        $version = $this->openDraftFor($project) ?? $this->openDraft($project);

        $version->update([
            'title' => $project->title,
            'description' => $project->description,
            'status' => 'submitted',
            'submitted_by' => $student->id,
            'submitted_at' => now(),
            // A resubmission starts its own review; carrying the previous
            // decision forward would show the new version as already judged.
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        return $version->fresh();
    }

    /**
     * A submitted version enters review once an assessor is on it.
     */
    public function markUnderReview(Project $project): void
    {
        $version = $project->currentVersion();

        if ($version && $version->status === 'submitted') {
            $version->update(['status' => 'under_review']);
        }
    }

    /**
     * Record a decision against the version it was made on.
     *
     * On a revision request the reviewed version is kept exactly as it was
     * and a fresh draft is opened beside it, so the student has something to
     * edit without touching the record the assessor will compare against.
     */
    public function recordDecision(
        Project $project,
        User $reviewer,
        string $decision,
        ?string $feedback = null,
        array $requiredChanges = [],
    ): ?ProjectVersion {
        $version = $project->currentVersion();

        if (! $version || $version->isEditable()) {
            return null;
        }

        $version->update([
            'status' => $decision === 'approved' ? 'approved' : 'revision_required',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'feedback' => $decision === 'approved' ? null : $feedback,
            'required_changes' => $decision === 'approved' ? null : array_values(array_filter($requiredChanges)),
        ]);

        if ($decision !== 'approved') {
            $this->openDraft($project, $version);
        }

        return $version->fresh();
    }

    /**
     * Move an approved proposal on to the final project work, which starts
     * its own run of versions at v1.0.
     */
    public function advanceToFinalStage(Project $project): ?ProjectVersion
    {
        if ($project->stage !== 'proposal') {
            return null;
        }

        $project->update(['stage' => 'final']);
        $project->refresh();

        return $this->openDraft($project);
    }

    /**
     * The pair a comparison is built from: the newest version and the one
     * before it in the same stage. Returns null when there is nothing to
     * compare against yet.
     */
    public function comparisonPair(Project $project, ?ProjectVersion $current = null): array
    {
        $current ??= $project->currentVersion();

        if (! $current) {
            return ['previous' => null, 'current' => null];
        }

        $previous = $project->versions()
            ->where('stage', $current->stage)
            ->where('sequence', '<', $current->sequence)
            ->reorder('sequence', 'desc')
            ->first();

        return ['previous' => $previous, 'current' => $current];
    }

    /**
     * Start the next draft of the project's current stage, carrying the
     * content forward so the student revises rather than retypes.
     */
    private function openDraft(Project $project, ?ProjectVersion $from = null): ProjectVersion
    {
        $nextSequence = ($project->versions()
            ->where('stage', $project->stage)
            ->max('sequence') ?? 0) + 1;

        return $project->versions()->create([
            'stage' => $project->stage,
            'sequence' => $nextSequence,
            'status' => 'draft',
            'title' => $from?->title ?? $project->title,
            'description' => $from?->description ?? $project->description,
        ]);
    }
}
