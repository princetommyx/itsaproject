<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_id', 'project_version_id', 'type', 'original_filename', 'stored_path', 'mime_type', 'size_bytes', 'uploaded_by', 'submitted_at'])]
class ProjectDocument extends Model
{
    use HasFactory;

    /**
     * The on-disk location is an internal detail. It was being serialised to
     * every client that could see the document, which hands out the storage
     * layout for free; nothing in the frontend reads it.
     */
    protected $hidden = ['stored_path'];

    protected function casts(): array
    {
        return ['submitted_at' => 'datetime'];
    }

    /**
     * Document types a student can submit, and the label shown for each.
     * Each type keeps its own upload history — the most recent upload of
     * a given type is "current"; older ones remain for submission history.
     */
    public const TYPES = [
        'proposal' => 'Project Proposal',
        'final_report' => 'Final Project Work Document',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The submission this file was uploaded against. Null for files uploaded
     * before versions existed — there is no version they belonged to, and
     * inventing one would file them under a submission they were never part
     * of.
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(ProjectVersion::class, 'project_version_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
