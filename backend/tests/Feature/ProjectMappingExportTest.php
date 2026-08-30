<?php

use App\Exports\ProjectMappingExport;
use App\Exports\StudentRosterExport;
use App\Models\Project;
use App\Models\User;

// Column positions in the Project Groups sheet.
const COL_TOPIC = 0;
const COL_SUPERVISOR = 3;
const COL_PROPOSAL_DEFENSE = 4;
const COL_FINAL_DEFENSE = 5;
const COL_FEEDBACK = 6;

it('escapes leading formula characters in exported project fields', function () {
    Project::create([
        'title' => '=cmd|"/c calc"!A1',
        'description' => 'D',
        'status' => 'draft',
        'feedback' => '+HYPERLINK("http://evil.example")',
    ]);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[COL_TOPIC])->toBe('\'=cmd|"/c calc"!A1');
    expect($row[COL_FEEDBACK])->toBe('\'+HYPERLINK("http://evil.example")');
});

it('leaves ordinary project fields untouched', function () {
    Project::create([
        'title' => 'Ordinary Project Title',
        'description' => 'D',
        'status' => 'draft',
        'feedback' => 'Good work overall.',
    ]);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[COL_TOPIC])->toBe('Ordinary Project Title');
    expect($row[COL_FEEDBACK])->toBe('Good work overall.');
});

it('exports the supervisor and both defense dates for a project', function () {
    $assessor = User::factory()->create(['role' => 'assessor', 'name' => 'Dr. Mensah']);

    Project::create([
        'title' => 'Scheduled Project',
        'description' => 'D',
        'status' => 'approved',
        'assessor_id' => $assessor->id,
        'proposal_defense_at' => '2026-09-14 10:30:00',
        'final_defense_at' => '2026-11-02 14:00:00',
    ]);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[COL_SUPERVISOR])->toBe('Dr. Mensah');
    expect($row[COL_PROPOSAL_DEFENSE])->toBe('14 Sep 2026, 10:30am');
    expect($row[COL_FINAL_DEFENSE])->toBe('02 Nov 2026, 2:00pm');
});

it('marks an unscheduled, unsupervised project rather than leaving it blank', function () {
    Project::create(['title' => 'Bare Project', 'description' => 'D', 'status' => 'draft']);

    $row = (new ProjectMappingExport)->collection()->first();

    expect($row[COL_SUPERVISOR])->toBe('Unassigned');
    expect($row[COL_PROPOSAL_DEFENSE])->toBe('Not scheduled');
    expect($row[COL_FINAL_DEFENSE])->toBe('Not scheduled');
});

it('gives every student a row carrying their topic, supervisor, and defense dates', function () {
    $assessor = User::factory()->create(['role' => 'assessor', 'name' => 'Dr. Owusu']);
    $student = User::factory()->create([
        'role' => 'student',
        'name' => 'Ama Boateng',
        'university_id' => 'UPSA/900001',
    ]);

    $project = Project::create([
        'title' => 'Campus Logistics Platform',
        'description' => 'D',
        'status' => 'approved',
        'assessor_id' => $assessor->id,
        'proposal_defense_at' => '2026-09-14 10:30:00',
    ]);
    $project->members()->create([
        'university_id' => $student->university_id,
        'student_id' => $student->id,
        'is_leader' => true,
    ]);

    $row = (new StudentRosterExport)->collection()->firstWhere(0, 'Ama Boateng');

    expect($row[1])->toBe('UPSA/900001');
    expect($row[3])->toBe('Campus Logistics Platform');
    expect($row[5])->toBe('Dr. Owusu');
    expect($row[7])->toBe('14 Sep 2026, 10:30am');
});

// A student nobody added is exactly who an admin is looking for, so the
// roster sheet has to keep them rather than skip the ones with no project.
it('keeps students with no group in the roster sheet', function () {
    User::factory()->create([
        'role' => 'student',
        'name' => 'Unplaced Student',
        'university_id' => 'UPSA/900002',
    ]);

    $row = (new StudentRosterExport)->collection()->firstWhere(0, 'Unplaced Student');

    expect($row)->not->toBeNull();
    expect($row[3])->toBe('No group yet');
    expect($row[5])->toBe('Unassigned');
    expect($row[6])->toBe('No Group');
});

// The download route builds the multi-sheet workbook, which needs the Export
// marker interface that WithMultipleSheets alone doesn't supply — without it
// the endpoint returns a 500 instead of a file, and nothing that only checks
// the sheet classes would catch it.
it('serves the workbook as a real download', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->get('/api/admin/projects/export');

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('upsa-project-data.xlsx');
});
