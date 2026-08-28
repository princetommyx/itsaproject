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
                self::escapeFormula($project->title),
                $project->status,
                self::escapeFormula($project->members->map(
                    fn ($member) => $member->student?->name ?? "{$member->university_id} (unregistered)"
                )->implode(', ')),
                self::escapeFormula($project->assessor?->name ?? 'Unassigned'),
                self::escapeFormula($project->feedback),
            ];
        });
    }

    /**
     * Project titles, member names, and feedback all come from user input.
     * A value starting with =, +, -, or @ is a live formula to Excel/Sheets
     * the moment someone opens the file — prefixing it with a quote forces
     * text interpretation instead. See CWE-1236 (CSV/Excel injection).
     */
    private static function escapeFormula(?string $value): ?string
    {
        if ($value !== null && preg_match('/^[=+\-@]/', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
