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

it('returns aggregate dashboard stats', function () {
    $admin = User::factory()->admin()->create();

    Project::create(['title' => 'A', 'description' => 'D', 'status' => 'approved']);
    Project::create(['title' => 'B', 'description' => 'D', 'status' => 'pending']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');

    $response->assertOk()->assertJsonPath('approved', 1)->assertJsonPath('pending', 1);
});
