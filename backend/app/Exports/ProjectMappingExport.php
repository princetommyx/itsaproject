<?php

namespace App\Exports;

use App\Models\Project;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProjectMappingExport implements FromCollection, WithHeadings
{
    public function headings(): array
    {
        return ['Project Title', 'Status', 'Group Members', 'Assessor', 'Feedback'];
    }

    public function collection(): Enumerable
    {
        return Project::with(['members.student', 'assessor'])->get()->map(function (Project $project) {
            return [
                $project->title,
                $project->status,
                $project->members->map(
                    fn ($member) => $member->student?->name ?? "{$member->university_id} (unregistered)"
                )->implode(', '),
                $project->assessor?->name ?? 'Unassigned',
                $project->feedback,
            ];
        });
    }
}
