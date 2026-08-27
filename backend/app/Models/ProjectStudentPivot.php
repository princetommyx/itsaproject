<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectStudentPivot extends Pivot
{
    protected $table = 'project_student';

    protected function casts(): array
    {
        return [
            'is_leader' => 'boolean',
        ];
    }
}
