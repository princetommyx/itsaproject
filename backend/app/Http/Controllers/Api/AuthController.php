<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
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
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
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

        if (! $record || ! Hash::check($validated['token'], $record->token)) {
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
