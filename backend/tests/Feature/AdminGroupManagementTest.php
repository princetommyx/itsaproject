<?php

use App\Models\Project;
use App\Models\User;
use App\Notifications\AddedToGroupNotification;
use App\Notifications\DefenseScheduledNotification;
use Illuminate\Support\Facades\Notification;

function projectWithLeader(array $attributes = []): Project
{
    $leader = User::factory()->student()->create();

    $project = Project::create(array_merge(
        ['title' => 'Campus Logistics', 'description' => 'D', 'status' => 'draft'],
        $attributes
    ));
    $project->members()->create([
        'university_id' => $leader->university_id,
        'student_id' => $leader->id,
        'is_leader' => true,
    ]);

    return $project;
}

it('lets an admin place an ungrouped student into a group and notifies them', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['name' => 'Kwame Mensah']);
    $project = projectWithLeader();

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/members", ['student_id' => $student->id]);

    $response->assertOk();
    $this->assertDatabaseHas('project_student', [
        'project_id' => $project->id,
        'student_id' => $student->id,
        'is_leader' => false,
    ]);

    Notification::assertSentTo($student, AddedToGroupNotification::class);
});

// Adding a student who is already placed would otherwise fail on the unique
// index with an error the admin can do nothing with, so the group they are
// actually in has to be named.
it('refuses to place a student who already belongs to another group', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $first = projectWithLeader(['title' => 'Existing Group']);
    $first->members()->create([
        'university_id' => $student->university_id,
        'student_id' => $student->id,
        'is_leader' => false,
    ]);

    $second = projectWithLeader();

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$second->id}/members", ['student_id' => $student->id]);

    $response->assertStatus(422);
    expect($response->json('errors.student_id.0'))->toContain('Existing Group');
});

it('lets an admin undo a placement but never removes the group leader', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $project = projectWithLeader();

    $member = $project->members()->create([
        'university_id' => $student->university_id,
        'student_id' => $student->id,
        'is_leader' => false,
    ]);
    $leaderMember = $project->members()->where('is_leader', true)->first();

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/admin/projects/{$project->id}/members/{$member->id}")
        ->assertOk();
    $this->assertDatabaseMissing('project_student', ['id' => $member->id]);

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/admin/projects/{$project->id}/members/{$leaderMember->id}")
        ->assertStatus(422);
    $this->assertDatabaseHas('project_student', ['id' => $leaderMember->id]);
});

it('lets an admin schedule defense dates and notifies the group', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $project = projectWithLeader();
    $leader = $project->students()->first();

    $response = $this->actingAs($admin, 'sanctum')
        ->putJson("/api/admin/projects/{$project->id}/defense", [
            'proposal_defense_at' => '2026-09-14 10:30:00',
            'final_defense_at' => '2026-11-02 14:00:00',
        ]);

    $response->assertOk();
    $project->refresh();
    expect($project->proposal_defense_at->format('Y-m-d H:i'))->toBe('2026-09-14 10:30');
    expect($project->final_defense_at->format('Y-m-d H:i'))->toBe('2026-11-02 14:00');

    Notification::assertSentTo($leader, DefenseScheduledNotification::class);
});

// A cancelled sitting has to be clearable, or the group keeps seeing a date
// that has passed and no longer means anything.
it('lets an admin clear defense dates without sending a notification', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $project = projectWithLeader([
        'proposal_defense_at' => '2026-09-14 10:30:00',
        'final_defense_at' => '2026-11-02 14:00:00',
    ]);

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/admin/projects/{$project->id}/defense", [
            'proposal_defense_at' => null,
            'final_defense_at' => null,
        ])
        ->assertOk();

    $project->refresh();
    expect($project->proposal_defense_at)->toBeNull();
    expect($project->final_defense_at)->toBeNull();

    Notification::assertNothingSent();
});

it('returns a single student with their group, supervisor, and fellow members', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create(['name' => 'Dr. Owusu']);
    $student = User::factory()->student()->create(['name' => 'Ama Boateng']);

    $project = projectWithLeader(['status' => 'approved', 'assessor_id' => $assessor->id]);
    $project->members()->create([
        'university_id' => $student->university_id,
        'student_id' => $student->id,
        'is_leader' => false,
    ]);

    $response = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/students/{$student->id}");

    $response->assertOk();
    expect($response->json('name'))->toBe('Ama Boateng');
    expect($response->json('projects.0.title'))->toBe('Campus Logistics');
    expect($response->json('projects.0.assessor.name'))->toBe('Dr. Owusu');
    expect($response->json('projects.0.members'))->toHaveCount(2);
});

it('does not expose staff accounts through the student detail endpoint', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/admin/students/{$assessor->id}")
        ->assertNotFound();
});

it('can list only the students who have no group', function () {
    $admin = User::factory()->admin()->create();
    $ungrouped = User::factory()->student()->create(['name' => 'Unplaced Student']);
    $project = projectWithLeader();
    $grouped = $project->students()->first();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/students?filter=ungrouped');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names)->toContain($ungrouped->name);
    expect($names)->not->toContain($grouped->name);
});
