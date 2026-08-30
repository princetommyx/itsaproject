<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates a route on a permission rather than a role name.
 *
 * The existing is.admin / is.assessor / is.student middleware still guards
 * which area of the app someone reaches — that's about routing and
 * navigation. This guards individual capabilities inside those areas, so an
 * administrator can hand out a role like Project Coordinator that reaches the
 * admin area without being able to change system settings.
 */
class RequiresPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        abort_unless(
            $request->user()?->hasPermission($permission),
            403,
            'Your role does not allow this action.'
        );

        return $next($request);
    }
}
