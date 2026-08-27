<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProjectMappingExport implements FromCollection, WithHeadings
{
    public function headings(): array
    {
        return ['Project Title', 'Status', 'Group Members', 'Assessor', 'Feedback'];
    }

    public function collection()
    {
        return Project::with(['students', 'assessor'])->get()->map(function (Project $project) {
            return [
                $project->title,
                $project->status,
                $project->students->pluck('name')->implode(', '),
                $project->assessor?->name ?? 'Unassigned',
                $project->feedback,
            ];
        });
    }
}
