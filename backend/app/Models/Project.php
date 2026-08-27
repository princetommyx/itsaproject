<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['title', 'description', 'status', 'assessor_id', 'feedback'])]
class Project extends Model
{
    use HasFactory;

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_student', 'project_id', 'student_id')
            ->using(ProjectStudentPivot::class)
            ->withPivot('is_leader')
            ->withTimestamps();
    }

    public function leader(): ?User
    {
        return $this->students->firstWhere('pivot.is_leader', true);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessor_id');
    }
}
