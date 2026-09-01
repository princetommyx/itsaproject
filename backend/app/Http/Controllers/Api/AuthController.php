<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendStudentPasswordReset;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * A hash with no matching password, so Hash::check() always has real work
     * to do below — otherwise an unknown identifier returns near-instantly
     * while a known one takes a full bcrypt comparison, letting response time
     * alone reveal which index numbers/emails exist.
     *
     * It has to be built at the CONFIGURED cost, not frozen at one. This was a
     * literal `$2y$12$...`, which defeated its own purpose the moment
     * BCRYPT_ROUNDS was anything but 12: with real hashes at cost 10, an
     * unknown account took ~265ms against a real account's ~67ms, so the
     * timing gap it exists to close was reopened four times wider, pointing
     * the other way. Cost 12 also made every failed login pay the most
     * expensive comparison in the app — 1-3s on constrained hosting — which
     * is the path a student hits when they mistype their date of birth.
     *
     * Cached forever per cost, so the bcrypt to build it is paid once rather
     * than on every failed attempt.
     */
    private static ?string $dummyHash = null;

    private function dummyHash(): string
    {
        $rounds = config('hashing.bcrypt.rounds', 10);

        // Memoised per process before the cache is consulted. Every failed
        // login against an unknown identifier reads this, and on the cache
        // store that is a file read (or, worse, a database round trip) on the
        // exact path that has to stay indistinguishable from a real one. The
        // cache still backs it so a freshly started worker doesn't pay the
        // bcrypt to build one.
        return self::$dummyHash ??= Cache::rememberForever(
            "auth.dummy_hash.bcrypt.{$rounds}",
            fn () => Hash::make(Str::random(40))
        );
    }

    /**
     * Two counters, and both count FAILURES only.
     *
     * The route used to carry throttle:10,1 — ten requests per minute per IP,
     * successes included. Behind a university's NAT that is ten logins per
     * minute for the entire campus: on a submission morning the eleventh
     * student to sign in is refused, and no attacker had to do anything. This
     * counts only what an attacker generates, so a hall full of students
     * logging in successfully never consumes any of it.
     *
     * Keyed on identifier+IP first (targeted guessing against one account),
     * then on IP alone (an attacker walking the index-number range from one
     * host). Deliberately NOT on the identifier alone: that is a lockout
     * weapon — anyone could freeze a chosen student out of their own account
     * by failing five logins as them.
     *
     * Neither key leaks whether an account exists. The limiter is hit before
     * the user is looked up and the response is the same either way, so
     * UPSA/1000001 and UPSA/9999999 lock out identically.
     */
    private function throttleKeys(Request $request, string $identifier): array
    {
        $ip = $request->ip();

        return [
            [
                'key' => 'login:'.hash('xxh128', Str::lower($identifier).'|'.$ip),
                'max' => (int) config('auth.login_throttle.per_account', 5),
            ],
            [
                'key' => 'login-ip:'.hash('xxh128', (string) $ip),
                'max' => (int) config('auth.login_throttle.per_ip', 20),
            ],
        ];
    }

    /**
     * Dual-authentication gateway: a single login field routes to either
     * the student (index number) or staff (email) verification path.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($validated['identifier']);
        $limits = $this->throttleKeys($request, $identifier);

        foreach ($limits as $limit) {
            if (RateLimiter::tooManyAttempts($limit['key'], $limit['max'])) {
                return response()->json([
                    'message' => 'Too many sign-in attempts. Please try again in a moment.',
                ], 429, ['Retry-After' => RateLimiter::availableIn($limit['key'])]);
            }
        }

        $user = str_contains($identifier, '@')
            ? User::where('email', $identifier)->first()
            : User::where('university_id', $identifier)->first();

        // Order matters, and not for the reason it looks like. Hash::check is
        // evaluated FIRST and unconditionally, against the account's hash when
        // there is one and a stand-in of the same cost when there isn't, so an
        // unknown index number pays exactly the same bcrypt as a real one.
        // Short-circuiting on `! $user` instead would return in under a
        // millisecond and turn response time into a membership oracle for the
        // whole student roll — and index numbers here are sequential, so that
        // roll is trivially walkable.
        $passwordMatches = Hash::check($validated['password'], $user?->password ?? $this->dummyHash());

        if (! $passwordMatches || ! $user) {
            foreach ($limits as $limit) {
                RateLimiter::hit($limit['key']);
            }

            Log::warning('Failed login attempt', ['identifier' => $identifier, 'ip' => $request->ip()]);

            // One message, one status, one body shape for every failure —
            // unknown account, wrong password, no distinction. The client
            // renders this verbatim.
            throw ValidationException::withMessages([
                'identifier' => ['Invalid index number or password.'],
            ]);
        }

        // Their own attempts stop counting against them the moment they get
        // in, so a student who mistyped twice starts the next session clean.
        RateLimiter::clear($limits[0]['key']);

        // Passwords hashed before BCRYPT_ROUNDS was lowered (e.g. by the CSV
        // import) still carry the old, slower cost — bcrypt encodes its own
        // cost in the stored hash, so Hash::check keeps honoring whatever
        // cost a hash was made with until it's rehashed. Opportunistically
        // upgrade it here so every account migrates to the cheaper cost the
        // next time it logs in successfully, instead of staying slow forever.
        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => Hash::make($validated['password'])])->save();
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $response = response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);

        // Neither of these is anything the student is waiting for: the sign-in
        // record is for the administrators' log, and the prune is housekeeping.
        // Run after the response has been sent so they cost the person signing
        // in nothing. Locally that is ~3ms; against the deployed database,
        // which is a separate host, it is two network round trips.
        $userId = $user->id;
        $ip = $request->ip();
        $agent = $request->userAgent();

        dispatch(function () use ($userId, $ip, $agent) {
            LoginLog::create([
                'user_id' => $userId,
                'ip_address' => $ip,
                'user_agent' => $agent,
                'login_time' => now(),
            ]);

            // Sanctum tokens are rows, and every sign-in adds one. Without
            // this a student who has logged in weekly for a year leaves a
            // year of tokens behind, each of them still a working credential
            // if it ever leaked. Expired ones are no longer accepted anyway,
            // so deleting them costs nothing and bounds the blast radius.
            if ($minutes = config('sanctum.expiration')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->where('tokenable_id', $userId)
                    ->where('created_at', '<', now()->subMinutes($minutes))
                    ->delete();
            }
        })->afterResponse();

        return $response;
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    /**
     * The account, plus what it may do.
     *
     * Attached here rather than appended to the model: serialising a user
     * would otherwise resolve their role, and a list of fifty students would
     * become fifty extra queries for permissions nothing on that page reads.
     */
    private function userPayload(User $user): array
    {
        $user->loadMissing('assignedRole');

        return [
            ...$user->toArray(),
            'role_name' => $user->assignedRole?->name,
            'permissions' => $user->permissions(),
        ];
    }

    /**
     * First-login guard: students must set a new password on their
     * initial login before accessing the rest of the system.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'is_first_login' => false,
        ]);

        return response()->json(['message' => 'Password updated.']);
    }

    /**
     * Students request a reset token by Index Number; the token is
     * emailed to their mapped student_email.
     */
    public function requestPasswordReset(Request $request)
    {
        $validated = $request->validate([
            'university_id' => ['required', 'string'],
        ]);

        // Validate, write one job row, answer. Nothing here depends on whether
        // the index number belongs to anybody: the lookup, the token, the
        // database write and the mail all happen in the job, so every index
        // number anyone can type costs the same and the response time says
        // nothing. See SendStudentPasswordReset for what this used to leak.
        SendStudentPasswordReset::dispatch(trim($validated['university_id']));

        return response()->json([
            'message' => 'If the index number is registered, a reset link has been sent to the mapped email.',
        ]);
    }

    /**
     * Reset tokens are stored as SHA-256 digests; see the job for why.
     */
    private function resetTokenDigest(string $token): string
    {
        return hash('sha256', $token);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'university_id' => ['required', 'string'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('university_id', $validated['university_id'])
            ->where('role', 'student')
            ->first();

        if (! $user || ! $user->student_email) {
            throw ValidationException::withMessages([
                'university_id' => ['Invalid reset request.'],
            ]);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $user->student_email)
            ->first();

        $expiresAt = $record ? \Illuminate\Support\Carbon::parse($record->created_at)->addMinutes(config('auth.passwords.users.expire')) : null;

        // hash_equals for the SHA-256 digests, and Hash::check as a fallback
        // for any bcrypt row issued before this changed — those expire within
        // the hour, so the fallback is transitional, but without it every
        // reset link already in a student's inbox would break on deploy.
        $tokenValid = $record && (
            hash_equals($record->token, $this->resetTokenDigest($validated['token']))
            || (str_starts_with($record->token, '$2y$') && Hash::check($validated['token'], $record->token))
        );

        if (! $tokenValid || now()->greaterThan($expiresAt)) {
            throw ValidationException::withMessages([
                'token' => ['This password reset token is invalid or has expired.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'is_first_login' => false,
        ]);

        DB::table('password_reset_tokens')->where('email', $user->student_email)->delete();

        return response()->json(['message' => 'Password has been reset.']);
    }
}
