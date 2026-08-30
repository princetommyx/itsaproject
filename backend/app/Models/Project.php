<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'status', 'stage', 'assessor_id', 'feedback', 'proposal_defense_at', 'final_defense_at'])]
class Project extends Model
{
    use HasFactory;

    /**
     * The database default doesn't reach a model that was just created, so a
     * brand-new project would carry a null stage until it was re-read — long
     * enough for its first version to be written against nothing.
     */
    protected $attributes = ['stage' => 'proposal'];

    protected function casts(): array
    {
        return [
            'proposal_defense_at' => 'datetime',
            'final_defense_at' => 'datetime',
        ];
    }

    /**
     * The full group roster, including members added by Index Number who
     * don't have an account yet (ProjectMember::student is null for them).
     */
    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    /**
     * Only members with a real, linked account — e.g. for notifications,
     * where there's no account to notify otherwise.
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_student', 'project_id', 'student_id')
            ->using(ProjectStudentPivot::class)
            ->withPivot('is_leader')
            ->withTimestamps();
    }

    public function leader(): ?ProjectMember
    {
        return $this->members->firstWhere('is_leader', true);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessor_id');
    }

    /**
     * Every uploaded document, newest first — includes superseded uploads
     * of the same type, kept for submission history.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(ProjectDocument::class)->orderByDesc('created_at');
    }

    /**
     * The full submission history, oldest first. Nothing is ever removed from
     * here — a version the assessor sent back stays exactly as it was
     * submitted, which is what makes a comparison possible.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ProjectVersion::class)->orderBy('stage')->orderBy('sequence');
    }

    /**
     * The version the project is currently working on or awaiting a decision
     * for — the newest one in the active stage.
     */
    public function currentVersion(): ?ProjectVersion
    {
        // reorder(), not orderByDesc(): the relation already sorts ascending
        // for the history list, and appending a second sort leaves the
        // ascending one in front — which quietly returns the OLDEST version.
        return $this->versions()
            ->where('stage', $this->stage)
            ->reorder('sequence', 'desc')
            ->first();
    }
}
