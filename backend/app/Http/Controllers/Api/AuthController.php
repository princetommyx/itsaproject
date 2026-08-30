<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * A precomputed hash with no matching password, so Hash::check() always
     * has real work to do below — otherwise an unknown identifier returns
     * near-instantly while a known one takes a full bcrypt comparison,
     * letting response time alone reveal which index numbers/emails exist.
     */
    private const DUMMY_HASH = '$2y$12$Z6WDYnh7MUzwFDpauk24YOVhMk/ZU8CRBI0GCXIz02YpDhr3hQClC';

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

        $user = str_contains($identifier, '@')
            ? User::where('email', $identifier)->first()
            : User::where('university_id', $identifier)->first();

        if (! Hash::check($validated['password'], $user->password ?? self::DUMMY_HASH) || ! $user) {
            Log::warning('Failed login attempt', ['identifier' => $identifier, 'ip' => $request->ip()]);

            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

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

        LoginLog::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'login_time' => now(),
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
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

        $user = User::where('university_id', $validated['university_id'])
            ->where('role', 'student')
            ->first();

        if ($user && $user->student_email) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->student_email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );

            $user->notify(new \App\Notifications\StudentPasswordResetNotification($token));
        }

        return response()->json([
            'message' => 'If the index number is registered, a reset link has been sent to the mapped email.',
        ]);
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

        if (! $record || ! Hash::check($validated['token'], $record->token) || now()->greaterThan($expiresAt)) {
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
