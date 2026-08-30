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

    /**
     * What each permission actually lets someone do. The catalogue label is a
     * checkbox caption; this is the explanation behind it, shown when an
     * administrator opens a permission to read or reword it.
     */
    public const DESCRIPTIONS = [
        'projects.view_all' => 'See every project in the system, not only the ones assigned to them.',
        'projects.view_assigned' => 'See the projects an administrator has assigned to them for review.',
        'projects.review' => 'Approve a submission or send it back for revision, with feedback.',
        'projects.compare' => 'Open a submission beside the version before it to check what changed.',
        'projects.assign_assessor' => 'Choose which assessor reviews a submitted project.',
        'projects.manage_groups' => 'Place a student into a group by hand, or remove one.',
        'projects.schedule_defense' => 'Set the proposal and final defense dates for a group.',
        'projects.export' => 'Download the full project and student workbook.',
        'students.view' => 'Open the imported student roster and search it.',
        'students.import' => 'Upload a roster and create student accounts from it.',
        'staff.manage' => 'Create assessor and administrator accounts.',
        'project.create' => 'Start a project draft as a group leader.',
        'project.submit' => 'Submit a proposal or final work for review.',
        'project.view_feedback' => 'Read reviewer feedback and the full submission history.',
        'complaints.view' => 'Read the complaints students have filed.',
        'complaints.manage' => 'Reply to complaints and mark them resolved.',
        'complaints.submit' => 'File a complaint.',
        'settings.manage' => 'Change system settings — branding, submission rules, notifications.',
        'roles.manage' => 'Create roles, change what they allow, and assign them to staff.',
        'audit.view' => 'Read the record of who changed what, and when.',
        'logs.view' => 'Read the sign-in log.',
    ];

    /** Every permission key, flat. */
    public static function all(): array
    {
        return array_keys(array_merge(...array_values(self::CATALOGUE)));
    }

    /**
     * The catalogue as it should be shown, with any wording an administrator
     * has changed applied over the defaults.
     *
     * The keys are never overridden — a key is what a `can.do:` route checks,
     * so renaming one would silently revoke the permission everywhere it is
     * used. Only the label and description are an institution's to change.
     */
    public static function describe(): array
    {
        $overrides = \App\Models\PermissionLabel::all()->keyBy('permission');
        $described = [];

        foreach (self::CATALOGUE as $group => $permissions) {
            foreach ($permissions as $key => $label) {
                $override = $overrides->get($key);

                $described[] = [
                    'key' => $key,
                    'group' => $group,
                    'name' => $override->name ?? $label,
                    'description' => $override->description ?? self::DESCRIPTIONS[$key] ?? null,
                    'default_name' => $label,
                    'default_description' => self::DESCRIPTIONS[$key] ?? null,
                    'customised' => (bool) $override,
                ];
            }
        }

        return $described;
    }

    /**
     * Grouped the way the role builder renders it, with overrides applied.
     */
    public static function catalogueForBuilder(): array
    {
        $grouped = [];

        foreach (self::describe() as $permission) {
            $grouped[$permission['group']][$permission['key']] = $permission['name'];
        }

        return $grouped;
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
