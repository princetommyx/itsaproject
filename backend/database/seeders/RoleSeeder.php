<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Services\Permissions;
use Illuminate\Database\Seeder;

/**
 * The roles an institution starts with. Each is editable and most are
 * deletable — they're a starting point, not a fixed list. The three that map
 * onto the base roles are marked as system roles so deleting one can't leave
 * accounts with nothing.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Administrator',
                'slug' => 'administrator',
                'description' => 'Full access to every part of the system.',
                'base_role' => 'admin',
                'is_system' => true,
                'permissions' => Permissions::all(),
            ],
            [
                'name' => 'Assessor',
                'slug' => 'assessor',
                'description' => 'Reviews assigned projects and decides on submissions.',
                'base_role' => 'assessor',
                'is_system' => true,
                'permissions' => Permissions::forBaseRole('assessor'),
            ],
            [
                'name' => 'Student',
                'slug' => 'student',
                'description' => 'Submits a project and tracks its progress.',
                'base_role' => 'student',
                'is_system' => true,
                'permissions' => Permissions::forBaseRole('student'),
            ],
            [
                'name' => 'Project Coordinator',
                'slug' => 'project-coordinator',
                'description' => 'Oversees projects and assigns assessors, without changing system settings.',
                'base_role' => 'admin',
                'is_system' => false,
                'permissions' => [
                    'projects.view_all', 'projects.compare', 'projects.assign_assessor',
                    'projects.manage_groups', 'projects.schedule_defense', 'projects.export',
                    'students.view', 'complaints.view', 'logs.view',
                ],
            ],
            [
                'name' => 'Supervisor',
                'slug' => 'supervisor',
                'description' => 'Follows assigned students and comments on their progress.',
                'base_role' => 'assessor',
                'is_system' => false,
                'permissions' => ['projects.view_assigned', 'projects.compare', 'project.view_feedback'],
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
