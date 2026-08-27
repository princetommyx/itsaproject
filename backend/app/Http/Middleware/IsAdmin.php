<?php

namespace App\Http\Middleware;

class IsAdmin extends EnsureRole
{
    protected string $role = 'admin';
}
