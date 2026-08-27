<?php

use App\Models\User;

it('lets a student file a complaint', function () {
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $response = $this->actingAs($student, 'sanctum')->postJson('/api/student/complaints', [
        'subject' => 'Cannot submit project',
        'message' => 'The submit button is unresponsive.',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('complaints', [
        'student_id' => $student->id,
        'status' => 'open',
    ]);
});

it('lets an admin view and resolve complaints', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $complaint = $student->complaints()->create([
        'subject' => 'Issue',
        'message' => 'Details',
        'status' => 'open',
    ]);

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/admin/complaints')
        ->assertOk()
        ->assertJsonCount(1);

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/admin/complaints/{$complaint->id}", ['status' => 'resolved'])
        ->assertOk();

    expect($complaint->fresh()->status)->toBe('resolved');
});
