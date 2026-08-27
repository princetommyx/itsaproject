<?php

namespace App\Http\Middleware;

class IsStudent extends EnsureRole
{
    protected string $role = 'student';
}
