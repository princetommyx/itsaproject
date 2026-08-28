<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

it('imports students from a CSV with hashed DOB as the default password', function () {
    $admin = User::factory()->admin()->create();

    $csv = "Student Name,Index Number,Email,Date of Birth\n".
        "Ama Boateng,UPSA/1000001,ama@example.com,2000-05-10\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/students/import', ['file' => $file]);

    $response->assertOk();
    $this->assertDatabaseHas('users', [
        'university_id' => 'UPSA/1000001',
        'role' => 'student',
        'is_first_login' => true,
    ]);

    $student = User::where('university_id', 'UPSA/1000001')->first();
    expect(Hash::check('20000510', $student->password))->toBeTrue();
});

it('lets an admin assign an assessor to an unassigned project', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $leader = User::factory()->student()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/assign", ['assessor_id' => $assessor->id]);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('pending');
    expect($project->fresh()->assessor_id)->toBe($assessor->id);

    Notification::assertSentTo($assessor, \App\Notifications\ProjectAssignedNotification::class);
});

it('lets an assessor see and read their in-app assignment notification', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $leader = User::factory()->student()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/assign", ['assessor_id' => $assessor->id])
        ->assertOk();

    $response = $this->actingAs($assessor, 'sanctum')->getJson('/api/assessor/notifications');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['data'])->toMatchArray(['type' => 'project_assigned', 'kind' => 'assigned', 'project_id' => $project->id]);
    expect($response->json()[0]['read_at'])->toBeNull();

    $notificationId = $response->json()[0]['id'];

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/notifications/{$notificationId}/read")
        ->assertOk();

    expect($assessor->notifications()->first()->read_at)->not->toBeNull();
});

it('lets an admin see their in-app new-submission notification', function () {
    $admin = User::factory()->admin()->create();
    $leader = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/notifications');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['data'])->toMatchArray(['type' => 'project_submitted', 'kind' => 'submitted']);
});

it('returns aggregate dashboard stats', function () {
    $admin = User::factory()->admin()->create();

    Project::create(['title' => 'A', 'description' => 'D', 'status' => 'approved']);
    Project::create(['title' => 'B', 'description' => 'D', 'status' => 'pending']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');

    $response->assertOk()->assertJsonPath('approved', 1)->assertJsonPath('pending', 1);
});

it('lists all submitted projects for admin oversight, excluding drafts', function () {
    $admin = User::factory()->admin()->create();

    Project::create(['title' => 'Draft', 'description' => 'D', 'status' => 'draft']);
    Project::create(['title' => 'Pending', 'description' => 'D', 'status' => 'pending']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/projects');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['title'])->toBe('Pending');
});

it('lets an admin approve a pending project as a backup to the assessor', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved']);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('approved');
    Notification::assertSentTo($student, \App\Notifications\ProjectDecisionNotification::class);
});

it('lets an admin decide directly on a project that has not been assigned an assessor yet', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved']);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('approved');
});

it('prevents an admin from deciding on a project that is not awaiting review', function () {
    $admin = User::factory()->admin()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved'])
        ->assertUnprocessable();
});
