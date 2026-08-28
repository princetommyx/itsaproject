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

it('lets the leader add a partner who has no account yet', function () {
    $leader = studentUser();

    $project = $this->actingAs($leader, 'sanctum')->postJson('/api/student/projects', [
        'title' => 'Project A',
        'description' => 'Desc A',
    ])->json();

    $response = $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project['id']}/members", ['university_id' => 'UPSA/9999999']);

    $response->assertOk();
    $this->assertDatabaseHas('project_student', [
        'university_id' => 'UPSA/9999999',
        'student_id' => null,
    ]);
});

it('links a pending member automatically once their account is imported', function () {
    $leader = studentUser();
    $admin = User::factory()->admin()->create();

    $project = $this->actingAs($leader, 'sanctum')->postJson('/api/student/projects', [
        'title' => 'Project A',
        'description' => 'Desc A',
    ])->json();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project['id']}/members", ['university_id' => 'UPSA/9999999'])
        ->assertOk();

    $csv = "Student Name,Index Number,Email,Date of Birth\n".
        "New Student,UPSA/9999999,new@example.com,2001-01-01\n";
    $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('students.csv', $csv);

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/students/import', ['file' => $file])
        ->assertOk();

    $newStudent = User::where('university_id', 'UPSA/9999999')->first();
    $this->assertDatabaseHas('project_student', [
        'university_id' => 'UPSA/9999999',
        'student_id' => $newStudent->id,
    ]);
});

it('enforces group exclusivity: one index number cannot join two groups, registered or not', function () {
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

    // Same exclusivity applies to a not-yet-registered index number.
    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project['id']}/members", ['university_id' => 'UPSA/8888888'])
        ->assertOk();

    $this->actingAs($otherLeader, 'sanctum')
        ->postJson("/api/student/projects/{$otherProject['id']}/members", ['university_id' => 'UPSA/8888888'])
        ->assertUnprocessable();
});

it('only allows the group leader to submit the project', function () {
    $leader = studentUser();
    $member = studentUser();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);
    $project->members()->create(['university_id' => $member->university_id, 'student_id' => $member->id, 'is_leader' => false]);

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
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->putJson("/api/student/projects/{$project->id}", ['description' => 'Narrower scope description.'])
        ->assertOk();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($project->fresh()->status)->toBe('submitted_unassigned');
});

it('does not let the leader remove themselves from the group', function () {
    $leader = studentUser();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $leaderMember = $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->deleteJson("/api/student/projects/{$project->id}/members/{$leaderMember->id}")
        ->assertUnprocessable();
});

it('lets the leader remove a pending (unregistered) member', function () {
    $leader = studentUser();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);
    $pending = $project->members()->create(['university_id' => 'UPSA/7777777', 'student_id' => null, 'is_leader' => false]);

    $this->actingAs($leader, 'sanctum')
        ->deleteJson("/api/student/projects/{$project->id}/members/{$pending->id}")
        ->assertOk();

    $this->assertDatabaseMissing('project_student', ['id' => $pending->id]);
});
