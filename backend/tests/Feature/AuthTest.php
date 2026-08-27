<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('logs a student in with their index number', function () {
    $student = User::factory()->student()->create([
        'university_id' => 'UPSA/1234567',
        'password' => Hash::make('20000101'),
    ]);

    $response = $this->postJson('/api/login', [
        'identifier' => 'UPSA/1234567',
        'password' => '20000101',
    ]);

    $response->assertOk()->assertJsonStructure(['token', 'user']);
    $this->assertDatabaseHas('login_logs', ['user_id' => $student->id]);
});

it('logs staff in with their email', function () {
    $assessor = User::factory()->assessor()->create([
        'email' => 'j.ofoeda@upsa.edu.gh',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/login', [
        'identifier' => 'j.ofoeda@upsa.edu.gh',
        'password' => 'secret123',
    ]);

    $response->assertOk();
    expect($response->json('user.id'))->toBe($assessor->id);
});

it('rejects invalid credentials', function () {
    User::factory()->student()->create([
        'university_id' => 'UPSA/0000001',
        'password' => Hash::make('20000101'),
    ]);

    $this->postJson('/api/login', [
        'identifier' => 'UPSA/0000001',
        'password' => 'wrong-password',
    ])->assertUnprocessable();
});

it('blocks a first-login student from other endpoints until password is changed', function () {
    $student = User::factory()->student()->create();

    $this->actingAs($student, 'sanctum')
        ->getJson('/api/student/project')
        ->assertStatus(423);
});

it('allows a student to change their password on first login', function () {
    $student = User::factory()->student()->create([
        'dob' => '2000-01-01',
        'password' => Hash::make('20000101'),
        'is_first_login' => true,
    ]);

    $this->actingAs($student, 'sanctum')
        ->postJson('/api/password/change', [
            'current_password' => '20000101',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertOk();

    $student->refresh();
    expect($student->is_first_login)->toBeFalse();
    expect(Hash::check('new-secure-password', $student->password))->toBeTrue();
});
