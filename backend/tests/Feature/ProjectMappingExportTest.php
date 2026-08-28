<?php

use App\Exports\ProjectMappingExport;
use App\Models\Project;

it('escapes leading formula characters in exported project fields', function () {
    $project = Project::create([
        'title' => '=cmd|"/c calc"!A1',
        'description' => 'D',
        'status' => 'draft',
        'feedback' => '+HYPERLINK("http://evil.example")',
    ]);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[0])->toBe('\'=cmd|"/c calc"!A1');
    expect($row[4])->toBe('\'+HYPERLINK("http://evil.example")');
});

it('leaves ordinary project fields untouched', function () {
    $project = Project::create([
        'title' => 'Ordinary Project Title',
        'description' => 'D',
        'status' => 'draft',
        'feedback' => 'Good work overall.',
    ]);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[0])->toBe('Ordinary Project Title');
    expect($row[4])->toBe('Good work overall.');
});
