<?php

use App\Models\User;
use App\Notifications\StudentPasswordResetNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

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

it('transparently upgrades a password hashed at an old, more expensive bcrypt cost on next login', function () {
    $student = User::factory()->student()->create(['university_id' => 'UPSA/3000001']);

    // Simulate a hash created back when BCRYPT_ROUNDS was 12, written
    // directly so it bypasses the model's "hashed" cast — that cast
    // rejects assigning a hash costlier than the current config, which is
    // exactly the pre-existing-data scenario this test needs to set up.
    DB::table('users')->where('id', $student->id)->update([
        'password' => password_hash('20000101', PASSWORD_BCRYPT, ['cost' => 12]),
    ]);

    $this->postJson('/api/login', [
        'identifier' => 'UPSA/3000001',
        'password' => '20000101',
    ])->assertOk();

    $student->refresh();
    expect(Hash::needsRehash($student->password))->toBeFalse();
    expect(Hash::check('20000101', $student->password))->toBeTrue();
});

it('rejects login for an identifier that does not exist, same as a wrong password', function () {
    $this->postJson('/api/login', [
        'identifier' => 'UPSA/9999999',
        'password' => 'whatever',
    ])->assertUnprocessable();
});

it('throttles repeated login attempts from the same client', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/login', ['identifier' => 'nobody', 'password' => 'nope'])
            ->assertUnprocessable();
    }

    $this->postJson('/api/login', ['identifier' => 'nobody', 'password' => 'nope'])
        ->assertStatus(429);
});

it('resets a password with a valid token', function () {
    Notification::fake();

    $student = User::factory()->student()->create(['university_id' => 'UPSA/2000001']);

    $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/2000001'])->assertOk();

    $token = null;
    Notification::assertSentTo($student, StudentPasswordResetNotification::class, function ($notification) use (&$token) {
        $token = (fn () => $this->token)->call($notification);

        return true;
    });

    $this->postJson('/api/password/reset', [
        'university_id' => 'UPSA/2000001',
        'token' => $token,
        'password' => 'new-secure-password',
        'password_confirmation' => 'new-secure-password',
    ])->assertOk();

    $student->refresh();
    expect(Hash::check('new-secure-password', $student->password))->toBeTrue();
});

it('rejects a password reset token once it has expired', function () {
    Notification::fake();

    $student = User::factory()->student()->create(['university_id' => 'UPSA/2000002']);

    $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/2000002'])->assertOk();

    $token = null;
    Notification::assertSentTo($student, StudentPasswordResetNotification::class, function ($notification) use (&$token) {
        $token = (fn () => $this->token)->call($notification);

        return true;
    });

    DB::table('password_reset_tokens')
        ->where('email', $student->student_email)
        ->update(['created_at' => now()->subMinutes(config('auth.passwords.users.expire') + 1)]);

    $this->postJson('/api/password/reset', [
        'university_id' => 'UPSA/2000002',
        'token' => $token,
        'password' => 'new-secure-password',
        'password_confirmation' => 'new-secure-password',
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
