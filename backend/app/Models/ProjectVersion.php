<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id', 'stage', 'sequence', 'status', 'title', 'description',
    'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at',
    'feedback', 'required_changes',
])]
class ProjectVersion extends Model
{
    use HasFactory;

    public const STAGES = [
        'proposal' => 'Project Proposal',
        'final' => 'Final Project Work',
    ];

    public const STATUS_LABELS = [
        'draft' => 'Draft',
        'submitted' => 'Submitted',
        'under_review' => 'Under Review',
        'revision_required' => 'Revision Required',
        'approved' => 'Approved',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'required_changes' => 'array',
        ];
    }

    /**
     * Serialized alongside the row so every surface — the history list, the
     * compare header, a notification — names a version the same way, instead
     * of each one inventing its own format from `sequence`.
     */
    protected $appends = ['label'];

    /**
     * v1.0, v1.1, v1.2 … The major number is reserved for a future where a
     * stage can be restarted outright; today every version of a stage is a
     * revision of the same submission, which is what a minor bump means.
     */
    public function getLabelAttribute(): string
    {
        return 'v1.'.($this->sequence - 1);
    }

    /**
     * A version stops being editable the moment it leaves the student's
     * hands. Revising means a new version, never an edit to the reviewed one.
     */
    public function isEditable(): bool
    {
        return $this->status === 'draft';
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ProjectDocument::class)->orderByDesc('created_at');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
