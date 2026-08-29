<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_id', 'type', 'original_filename', 'stored_path', 'mime_type', 'size_bytes', 'uploaded_by'])]
class ProjectDocument extends Model
{
    use HasFactory;

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

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
