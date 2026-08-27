<?php

namespace App\Http\Middleware;

class IsAssessor extends EnsureRole
{
    protected string $role = 'assessor';
}
