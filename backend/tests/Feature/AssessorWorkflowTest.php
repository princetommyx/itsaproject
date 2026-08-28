<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

it('lets an assessor approve a pending project', function () {
    Notification::fake();

    $assessor = User::factory()->assessor()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $response = $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", ['decision' => 'approved']);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('approved');
    Notification::assertSentTo($student, \App\Notifications\ProjectDecisionNotification::class);
});

it('requires feedback text when sending a project back for refinement', function () {
    $assessor = User::factory()->assessor()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", ['decision' => 'refine'])
        ->assertUnprocessable();

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", [
            'decision' => 'refine',
            'feedback' => 'Please expand your methodology section.',
        ])->assertOk();

    expect($project->fresh()->status)->toBe('refine');
    expect($project->fresh()->feedback)->toBe('Please expand your methodology section.');
});

it('prevents an assessor from deciding on a project not assigned to them', function () {
    $assessor = User::factory()->assessor()->create();
    $otherAssessor = User::factory()->assessor()->create();

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $otherAssessor->id,
    ]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", ['decision' => 'approved'])
        ->assertForbidden();
});
