<?php

use App\Jobs\SendStudentPasswordReset;
use App\Models\User;
use App\Notifications\StudentPasswordResetNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

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

it('throttles repeated failed login attempts against the same account', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/login', ['identifier' => 'nobody', 'password' => 'nope'])
            ->assertUnprocessable();
    }

    $this->postJson('/api/login', ['identifier' => 'nobody', 'password' => 'nope'])
        ->assertStatus(429);
});

// The reason the limiter counts failures rather than requests. A university's
// students share a handful of NAT'd addresses, so counting every request meant
// a hall of people signing in correctly locked each other out.
it('never spends the throttle on successful logins', function () {
    $student = User::factory()->student()->create([
        'university_id' => 'UPSA/3000001',
        'password' => Hash::make('correct-horse'),
    ]);

    for ($i = 0; $i < 30; $i++) {
        $this->postJson('/api/login', [
            'identifier' => 'UPSA/3000001',
            'password' => 'correct-horse',
        ])->assertOk();
    }
});

it('forgives a student their earlier typos once they get in', function () {
    User::factory()->student()->create([
        'university_id' => 'UPSA/3000002',
        'password' => Hash::make('correct-horse'),
    ]);

    foreach (['wrong-1', 'wrong-2', 'wrong-3', 'wrong-4'] as $attempt) {
        $this->postJson('/api/login', ['identifier' => 'UPSA/3000002', 'password' => $attempt])
            ->assertUnprocessable();
    }

    $this->postJson('/api/login', ['identifier' => 'UPSA/3000002', 'password' => 'correct-horse'])
        ->assertOk();

    // Without the clear on success, one attempt would be left and the next
    // typo would lock them out of an account they had just proved was theirs.
    foreach (['wrong-a', 'wrong-b', 'wrong-c', 'wrong-d'] as $attempt) {
        $this->postJson('/api/login', ['identifier' => 'UPSA/3000002', 'password' => $attempt])
            ->assertUnprocessable();
    }
});

// Enumeration: everything an attacker can read without a stopwatch.
it('answers an unknown index number exactly as it answers a wrong password', function () {
    User::factory()->student()->create([
        'university_id' => 'UPSA/3000003',
        'password' => Hash::make('correct-horse'),
    ]);

    $wrongPassword = $this->postJson('/api/login', [
        'identifier' => 'UPSA/3000003', 'password' => 'not-the-password',
    ]);

    $unknownAccount = $this->postJson('/api/login', [
        'identifier' => 'UPSA/9999999', 'password' => 'not-the-password',
    ]);

    expect($unknownAccount->status())->toBe($wrongPassword->status())
        ->and($unknownAccount->json())->toEqual($wrongPassword->json())
        ->and($wrongPassword->json('message'))->toBe('Invalid index number or password.');
});

it('answers a password reset for an unknown index number identically', function () {
    Notification::fake();

    User::factory()->student()->create(['university_id' => 'UPSA/3000004']);

    $known = $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/3000004']);
    $unknown = $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/9999999']);

    expect($unknown->status())->toBe($known->status())
        ->and($unknown->json())->toEqual($known->json());
});

it('stores reset tokens hashed, never in the clear', function () {
    Notification::fake();

    $student = User::factory()->student()->create([
        'university_id' => 'UPSA/3000005',
        'student_email' => 'reset.probe@students.upsa.edu.gh',
    ]);

    $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/3000005'])->assertOk();

    $token = null;
    Notification::assertSentTo($student, StudentPasswordResetNotification::class, function ($notification) use (&$token) {
        $token = (fn () => $this->token)->call($notification);

        return true;
    });

    $stored = DB::table('password_reset_tokens')->where('email', $student->student_email)->value('token');

    expect($stored)->not->toBe($token)
        ->and($stored)->toBe(hash('sha256', $token));
});

// The enumeration guarantee, asserted structurally rather than by stopwatch:
// the request itself must do no work that depends on the account existing.
// A timing test would be flaky in CI; this one fails the moment somebody
// moves the lookup, the token write or the mail back into the controller.
it('does no account-dependent work while answering a reset request', function () {
    Queue::fake();
    Notification::fake();

    $student = User::factory()->student()->create(['university_id' => 'UPSA/3000006']);

    $known = $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/3000006']);
    $unknown = $this->postJson('/api/password/forgot', ['university_id' => 'UPSA/9999999']);

    expect($unknown->status())->toBe($known->status())
        ->and($unknown->json())->toEqual($known->json());

    // One job for each, including the index number that belongs to nobody:
    // the job decides there is no such student, the request never knew.
    Queue::assertPushed(SendStudentPasswordReset::class, 2);

    // And nothing was written or sent while answering.
    Notification::assertNothingSent();
    expect(DB::table('password_reset_tokens')->count())->toBe(0)
        ->and($student->fresh()->student_email)->not->toBeNull();
});

it('issues tokens that expire', function () {
    expect(config('sanctum.expiration'))->toBeInt()->toBeGreaterThan(0);
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
