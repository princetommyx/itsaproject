<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * The workbook an administrator downloads: one sheet per group, one sheet
 * per student. Two views of the same data, because the two questions asked
 * of it ("what is this group doing" / "where does this student stand") don't
 * have the same shape.
 */
class ProjectDataExport implements Export, WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new ProjectMappingExport,
            new StudentRosterExport,
        ];
    }
}
