<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'status', 'assessor_id', 'feedback', 'proposal_defense_at', 'final_defense_at'])]
class Project extends Model
{
    use HasFactory;

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
}
