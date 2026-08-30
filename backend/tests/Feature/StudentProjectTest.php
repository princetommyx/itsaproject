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

it('notifies the student in-app when their project is sent back for refinement', function () {
    $assessor = User::factory()->assessor()->create();
    $student = studentUser();

    $project = Project::create([
        'title' => 'Smart Irrigation System',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", [
            'decision' => 'refine',
            'feedback' => 'Please expand your methodology section.',
        ])->assertOk();

    $response = $this->actingAs($student, 'sanctum')->getJson('/api/student/notifications');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['data'])->toMatchArray([
        'project_id' => $project->id,
        'project_title' => 'Smart Irrigation System',
        'status' => 'refine',
        'feedback' => 'Please expand your methodology section.',
    ]);
    expect($response->json()[0]['read_at'])->toBeNull();
});

it('notifies every admin in-app when a project is submitted for the first time', function () {
    $admin = User::factory()->admin()->create();
    $otherAdmin = User::factory()->admin()->create();
    $leader = studentUser();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($admin->notifications()->count())->toBe(1);
    expect($admin->notifications()->first()->data)->toMatchArray(['type' => 'project_submitted', 'kind' => 'submitted']);
    expect($otherAdmin->notifications()->count())->toBe(1);
});

it('notifies the previous assessor in-app when a student resubmits after refine', function () {
    $assessor = User::factory()->assessor()->create();
    $admin = User::factory()->admin()->create();
    $leader = studentUser();

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'refine',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($assessor->notifications()->count())->toBe(1);
    expect($assessor->notifications()->first()->data)->toMatchArray(['type' => 'project_resubmitted', 'kind' => 'resubmitted']);
    // A resubmission is routed back to the same assessor, not broadcast to admins.
    expect($admin->notifications()->count())->toBe(0);
});

it('lets a student mark a notification as read', function () {
    $assessor = User::factory()->assessor()->create();
    $student = studentUser();

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", ['decision' => 'approved']);

    $notificationId = $student->notifications()->first()->id;

    $this->actingAs($student, 'sanctum')
        ->postJson("/api/student/notifications/{$notificationId}/read")
        ->assertOk();

    expect($student->notifications()->first()->read_at)->not->toBeNull();
});

it('records a name alongside the index number when adding a member who has no account yet', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/members", [
            'university_id' => 'UPSA/9000001',
            'name' => 'Kwame Mensah',
        ])->assertOk();

    $member = App\Models\ProjectMember::where('university_id', 'UPSA/9000001')->first();
    expect($member->name)->toBe('Kwame Mensah');
    expect($member->student_id)->toBeNull();
});

it('keeps the name optional, so a member can still be added by index number alone', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/members", ['university_id' => 'UPSA/9000002'])
        ->assertOk();

    expect(App\Models\ProjectMember::where('university_id', 'UPSA/9000002')->first()->name)->toBeNull();
});

it('lets the real account name take over once that student is imported', function () {
    $admin = User::factory()->admin()->create();
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    // Added by a groupmate, spelled however they typed it.
    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/members", [
            'university_id' => 'UPSA/9000003',
            'name' => 'kwame m',
        ])->assertOk();

    // The roster import then creates the real account and links it up.
    $csv = "Student Name,Index Number,Email,Date of Birth\n".
        "Kwame Mensah,UPSA/9000003,kwame@example.com,2002-03-15\n";
    $this->actingAs($admin, 'sanctum')->postJson('/api/admin/students/import', [
        'file' => Illuminate\Http\UploadedFile::fake()->createWithContent('students.csv', $csv),
    ])->assertOk();

    $member = App\Models\ProjectMember::where('university_id', 'UPSA/9000003')->first();
    expect($member->student_id)->not->toBeNull();
    // The typed placeholder is kept but the account name is what gets shown.
    expect($member->name)->toBe('kwame m');
    expect($member->student->name)->toBe('Kwame Mensah');
});
