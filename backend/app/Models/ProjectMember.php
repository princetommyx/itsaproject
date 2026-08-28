<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['university_id', 'student_id', 'is_leader'])]
class ProjectMember extends Model
{
    protected $table = 'project_student';

    protected function casts(): array
    {
        return [
            'is_leader' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Null when this member hasn't been onboarded (imported/registered)
     * yet — they were added to the group by Index Number only.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
