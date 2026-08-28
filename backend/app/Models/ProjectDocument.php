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
        'chapter_1' => 'Chapter 1',
        'chapter_2' => 'Chapter 2',
        'chapter_3' => 'Chapter 3',
        'chapter_4' => 'Chapter 4',
        'chapter_5' => 'Chapter 5',
        'final_report' => 'Final Report',
        'presentation' => 'Presentation Slides',
        'source_code' => 'Source Code / ZIP',
        'supporting' => 'Supporting Document',
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
