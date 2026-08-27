<?php

use App\Models\User;

it('prevents a student from accessing admin routes', function () {
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $this->actingAs($student, 'sanctum')
        ->getJson('/api/admin/dashboard')
        ->assertForbidden();
});

it('prevents an assessor from accessing student routes', function () {
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($assessor, 'sanctum')
        ->getJson('/api/student/project')
        ->assertForbidden();
});

it('prevents a student from accessing assessor routes', function () {
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $this->actingAs($student, 'sanctum')
        ->getJson('/api/assessor/projects')
        ->assertForbidden();
});

it('allows an admin to access admin routes', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/admin/dashboard')
        ->assertOk();
});

it('rejects unauthenticated requests', function () {
    $this->getJson('/api/admin/dashboard')->assertUnauthorized();
});
