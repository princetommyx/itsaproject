<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'actor_name', 'actor_role', 'action',
    'subject_type', 'subject_id', 'meta', 'ip_address',
])]
class AuditLog extends Model
{
    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    /**
     * Human wording for each recorded action. An entry with no label here
     * still displays — it falls back to the dotted action — so adding a new
     * recorded action never leaves a blank row in the log.
     */
    public const ACTION_LABELS = [
        'project.approved' => 'Approved a project',
        'project.revision_requested' => 'Requested a revision',
        'project.assessor_assigned' => 'Assigned an assessor',
        'project.member_added' => 'Added a student to a group',
        'project.member_removed' => 'Removed a student from a group',
        'project.defense_scheduled' => 'Set defense dates',
        'settings.updated' => 'Updated system settings',
        'settings.logo_updated' => 'Changed the system logo',
        'settings.logo_removed' => 'Removed the system logo',
        'role.created' => 'Created a role',
        'role.updated' => 'Updated a role',
        'role.deleted' => 'Deleted a role',
        'permission.updated' => 'Reworded a permission',
        'permission.reset' => 'Reset a permission\'s wording',
        'user.role_assigned' => 'Changed a user\'s role',
        'students.imported' => 'Imported a student roster',
        'staff.created' => 'Created a staff account',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
