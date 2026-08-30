<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'university_id', 'email', 'student_email', 'dob', 'role', 'password', 'is_first_login'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'dob' => 'date',
            'password' => 'hashed',
            'is_first_login' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isAssessor(): bool
    {
        return $this->role === 'assessor';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    /**
     * Students have no staff `email`; route notifications to their
     * mapped student_email instead.
     */
    public function routeNotificationForMail(): string
    {
        return $this->isStudent() ? $this->student_email : $this->email;
    }

    /**
     * Projects this user (as a student) belongs to.
     */
    /**
     * Named assignedRole, not role: `role` is already the base-role column,
     * and a relation of the same name would be shadowed by the attribute —
     * silently returning the string 'admin' where a Role was expected.
     */
    public function assignedRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * Whether this user may do something.
     *
     * An assigned role decides it. Without one — which is most accounts, and
     * every account that existed before roles did — the answer comes from the
     * base role column, so nobody loses access because an administrator
     * hasn't visited the roles page.
     */
    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    /**
     * Every permission this user holds — sent to the client so the UI can
     * hide what someone can't do, rather than showing a control that fails
     * when they press it.
     */
    public function permissions(): array
    {
        if ($this->role_id && ! $this->relationLoaded('assignedRole')) {
            $this->load('assignedRole');
        }

        return $this->assignedRole?->permissions
            ?? \App\Services\Permissions::forBaseRole($this->role);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_student', 'student_id', 'project_id')
            ->using(ProjectStudentPivot::class)
            ->withPivot('is_leader')
            ->withTimestamps();
    }

    /**
     * Projects assigned to this user for assessment.
     */
    public function assignedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'assessor_id');
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'student_id');
    }

    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class);
    }
}
