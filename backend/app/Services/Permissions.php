<?php

namespace App\Services;

/**
 * The catalogue of things a role can be granted.
 *
 * Permissions live in code, not the database: each one names a specific
 * capability that the code has to check somewhere, so a permission nobody
 * checks would be a promise the system doesn't keep. Roles — which
 * permissions go together, and what that combination is called — are the part
 * that belongs to the institution, and those live in the database.
 */
class Permissions
{
    /**
     * Grouped for the permission builder, so an administrator picking
     * capabilities sees them in the shape of the system rather than as one
     * flat list of forty checkboxes.
     */
    public const CATALOGUE = [
        'Projects' => [
            'projects.view_all' => 'View every project',
            'projects.view_assigned' => 'View projects assigned to them',
            'projects.review' => 'Approve or request revisions',
            'projects.compare' => 'Compare submission versions',
            'projects.assign_assessor' => 'Assign assessors to projects',
            'projects.manage_groups' => 'Add or remove group members',
            'projects.schedule_defense' => 'Set defense dates',
            'projects.export' => 'Export project data',
        ],
        'People' => [
            'students.view' => 'View the student roster',
            'students.import' => 'Import students',
            'staff.manage' => 'Create and manage staff accounts',
        ],
        'Own Work' => [
            'project.create' => 'Create a project',
            'project.submit' => 'Submit a proposal or final work',
            'project.view_feedback' => 'View feedback and submission history',
        ],
        'Support' => [
            'complaints.view' => 'View complaints',
            'complaints.manage' => 'Respond to and resolve complaints',
            'complaints.submit' => 'Submit a complaint',
        ],
        'Administration' => [
            'settings.manage' => 'Change system settings',
            'roles.manage' => 'Create and edit roles',
            'audit.view' => 'View audit logs',
            'logs.view' => 'View login logs',
        ],
    ];

    /** Every permission key, flat. */
    public static function all(): array
    {
        return array_keys(array_merge(...array_values(self::CATALOGUE)));
    }

    public static function exists(string $permission): bool
    {
        return in_array($permission, self::all(), true);
    }

    /**
     * What a user gets when their account has no role assigned.
     *
     * Everything worked off the three-way role column before roles existed,
     * and most accounts still will. These are those capabilities written out,
     * so nobody loses access simply because an administrator hasn't visited
     * the roles page.
     */
    public static function forBaseRole(string $role): array
    {
        return match ($role) {
            'admin' => self::all(),
            'assessor' => [
                'projects.view_assigned', 'projects.review', 'projects.compare',
                'project.view_feedback',
            ],
            'student' => [
                'project.create', 'project.submit', 'project.view_feedback',
                'complaints.submit', 'projects.compare',
            ],
            default => [],
        };
    }
}
