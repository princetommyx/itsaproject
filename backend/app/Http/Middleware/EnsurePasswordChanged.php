<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * Block access to the rest of the API until a first-time
     * student has set a new password, per the blueprint's
     * first-login guard requirement.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->is_first_login) {
            abort(423, 'You must set a new password before continuing.');
        }

        return $next($request);
    }
}
