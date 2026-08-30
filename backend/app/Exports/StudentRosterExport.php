<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * A row per student: who they are, the group and topic they're on, who
 * supervises them, and when they defend.
 *
 * The group sheet answers "what is each group doing"; this answers "where
 * does this student stand", which is the question being asked when someone
 * looks a student up. Students with no group are included on purpose — they
 * are the ones that need attention, and leaving them out would hide exactly
 * the problem the sheet should surface.
 */
class StudentRosterExport implements FromCollection, WithHeadings, WithTitle
{
    use FormulaEscape;

    public function title(): string
    {
        return 'Students';
    }

    public function headings(): array
    {
        return [
            'Student Name',
            'Index Number',
            'Email',
            'Topic',
            'Group Members',
            'Supervisor',
            'Project Status',
            'Proposal Defense',
            'Project Defense',
        ];
    }

    public function collection(): Enumerable
    {
        return User::where('role', 'student')
            ->with(['projects.assessor', 'projects.members.student'])
            ->orderBy('name')
            ->get()
            ->map(function (User $student) {
                $project = $student->projects->first();

                $members = $project
                    ? $project->members
                        ->map(fn ($member) => $member->student?->name ?? $member->name ?? $member->university_id)
                        ->implode(', ')
                    : '';

                return [
                    self::escapeFormula($student->name),
                    self::escapeFormula($student->university_id),
                    self::escapeFormula($student->student_email),
                    self::escapeFormula($project?->title ?? 'No group yet'),
                    self::escapeFormula($members),
                    self::escapeFormula($project?->assessor?->name ?? 'Unassigned'),
                    self::statusLabel($project?->status ?? 'no_group'),
                    $project?->proposal_defense_at?->format('d M Y, g:ia') ?? 'Not scheduled',
                    $project?->final_defense_at?->format('d M Y, g:ia') ?? 'Not scheduled',
                ];
            });
    }
}
