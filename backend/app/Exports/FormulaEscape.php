<?php

namespace App\Exports;

trait FormulaEscape
{
    /**
     * The same words the app shows on screen. Exporting the raw enum
     * ("submitted_unassigned") makes a reader translate the database's
     * vocabulary in their head.
     */
    private const STATUS_LABELS = [
        'draft' => 'Draft',
        'submitted_unassigned' => 'Awaiting Assignment',
        'pending' => 'Under Review',
        'approved' => 'Approved',
        'refine' => 'Needs Refinement',
        'no_group' => 'No Group',
    ];

    protected static function statusLabel(?string $status): string
    {
        return self::STATUS_LABELS[$status] ?? (string) $status;
    }

    /**
     * Project titles, names, and feedback all come from user input. A value
     * starting with =, +, -, or @ is a live formula to Excel/Sheets the
     * moment someone opens the file — prefixing it with a quote forces text
     * interpretation instead. See CWE-1236 (CSV/Excel injection).
     */
    protected static function escapeFormula(?string $value): ?string
    {
        if ($value !== null && preg_match('/^[=+\-@]/', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
