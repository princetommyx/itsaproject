<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

abstract class EnsureRole
{
    /**
     * The role this middleware permits.
     */
    protected string $role = '';

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->role !== $this->role) {
            abort(403, 'You are not authorized to access this resource.');
        }

        return $next($request);
    }
}
