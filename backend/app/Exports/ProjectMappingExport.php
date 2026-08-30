<?php

namespace App\Exports;

use App\Models\Project;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * A row per project group: the topic, who is in it, who supervises it, and
 * when it defends.
 */
class ProjectMappingExport implements FromCollection, WithHeadings, WithTitle
{
    use FormulaEscape;

    public function title(): string
    {
        return 'Project Groups';
    }

    public function headings(): array
    {
        return [
            'Topic',
            'Status',
            'Group Members',
            'Supervisor',
            'Proposal Defense',
            'Project Defense',
            'Feedback',
        ];
    }

    public function collection(): Enumerable
    {
        return Project::with(['members.student', 'assessor'])->get()->map(function (Project $project) {
            return [
                self::escapeFormula($project->title),
                self::statusLabel($project->status),
                self::escapeFormula($project->members->map(
                    // Same precedence as the app: the linked account name wins,
                    // then the name the group typed, then the Index Number.
                    fn ($member) => $member->student?->name
                        ?? ($member->name ? "{$member->name} ({$member->university_id}, unregistered)" : "{$member->university_id} (unregistered)")
                )->implode(', ')),
                self::escapeFormula($project->assessor?->name ?? 'Unassigned'),
                $project->proposal_defense_at?->format('d M Y, g:ia') ?? 'Not scheduled',
                $project->final_defense_at?->format('d M Y, g:ia') ?? 'Not scheduled',
                self::escapeFormula($project->feedback),
            ];
        });
    }
}
