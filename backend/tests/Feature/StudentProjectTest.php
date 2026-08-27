<?php

use App\Models\Project;
use App\Models\User;

function studentUser(array $overrides = []): User
{
    return User::factory()->student()->create(array_merge(['is_first_login' => false], $overrides));
}

it('reports no project as a genuine null, not an empty object', function () {
    $student = studentUser();

    $response = $this->actingAs($student, 'sanctum')->getJson('/api/student/project');

    $response->assertOk()->assertExactJson(['project' => null]);
});

it('lets the group leader create a project draft', function () {
    $leader = studentUser();

    $response = $this->actingAs($leader, 'sanctum')->postJson('/api/student/projects', [
        'title' => 'AI-Powered Attendance System',
        'description' => 'A facial recognition attendance tracker.',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('projects', ['title' => 'AI-Powered Attendance System', 'status' => 'draft']);
    $this->assertDatabaseHas('project_student', ['student_id' => $leader->id, 'is_leader' => true]);
});

it('enforces group exclusivity: one student cannot join two groups', function () {
    $leader = studentUser();
    $member = studentUser();

    $project = $this->actingAs($leader, 'sanctum')->postJson('/api/student/projects', [
        'title' => 'Project A',
        'description' => 'Desc A',
    ])->json();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project['id']}/members", ['university_id' => $member->university_id])
        ->assertOk();

    $otherLeader = studentUser();
    $otherProject = $this->actingAs($otherLeader, 'sanctum')->postJson('/api/student/projects', [
        'title' => 'Project B',
        'description' => 'Desc B',
    ])->json();

    // member is already attached to Project A; attaching to Project B must fail.
    $this->actingAs($otherLeader, 'sanctum')
        ->postJson("/api/student/projects/{$otherProject['id']}/members", ['university_id' => $member->university_id])
        ->assertUnprocessable();

    expect(User::find($member->id)->projects)->toHaveCount(1);
});

it('only allows the group leader to submit the project', function () {
    $leader = studentUser();
    $member = studentUser();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->students()->attach($leader->id, ['is_leader' => true]);
    $project->students()->attach($member->id, ['is_leader' => false]);

    $this->actingAs($member, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertForbidden();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($project->fresh()->status)->toBe('submitted_unassigned');
});

it('lets the leader resubmit after refine feedback', function () {
    $leader = studentUser();

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'refine',
        'feedback' => 'Please narrow the scope.',
    ]);
    $project->students()->attach($leader->id, ['is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->putJson("/api/student/projects/{$project->id}", ['description' => 'Narrower scope description.'])
        ->assertOk();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($project->fresh()->status)->toBe('submitted_unassigned');
});
