<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The permission builder. Administrators define the roles their institution
 * actually uses instead of asking a developer to add one.
 */
class RoleController extends Controller
{
    public function index()
    {
        return response()->json([
            'roles' => Role::withCount('users')->orderByDesc('is_system')->orderBy('name')->get(),
            // The catalogue travels with the list so the builder renders the
            // permissions that exist right now, rather than a copy in the
            // client that goes stale the moment one is added.
            'catalogue' => Permissions::CATALOGUE,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRole($request);

        $role = Role::create([
            ...$validated,
            'slug' => $this->uniqueSlug($validated['name']),
            'is_system' => false,
        ]);

        activity_log('role.created', $role, ['name' => $role->name]);

        return response()->json($role, 201);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $this->validateRole($request, $role);

        // A system role can be renamed and its permissions tuned, but moving
        // it to a different base role would change which part of the app its
        // holders land in, stranding them somewhere they can't work.
        if ($role->is_system && isset($validated['base_role']) && $validated['base_role'] !== $role->base_role) {
            throw ValidationException::withMessages([
                'base_role' => ['A built-in role cannot be moved to a different base role.'],
            ]);
        }

        $before = $role->permissions ?? [];
        $role->update($validated);

        activity_log('role.updated', $role, [
            'name' => $role->name,
            'added' => array_values(array_diff($role->permissions ?? [], $before)),
            'removed' => array_values(array_diff($before, $role->permissions ?? [])),
        ]);

        return response()->json($role->fresh()->loadCount('users'));
    }

    public function destroy(Role $role)
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Built-in roles cannot be deleted. You can edit their permissions instead.'],
            ]);
        }

        // Holders fall back to their base role rather than losing access
        // outright, which is what the nullable foreign key already does — but
        // saying so is better than letting the admin discover it.
        $holders = $role->users()->count();
        $name = $role->name;
        $role->delete();

        activity_log('role.deleted', null, ['name' => $name, 'holders' => $holders]);

        return response()->json([
            'message' => $holders > 0
                ? "Role deleted. {$holders} user(s) have returned to their default permissions."
                : 'Role deleted.',
        ]);
    }

    /**
     * Give a user a role, or take theirs away.
     */
    public function assign(Request $request, User $user)
    {
        $validated = $request->validate([
            'role_id' => ['present', 'nullable', 'exists:roles,id'],
        ]);

        $role = $validated['role_id'] ? Role::findOrFail($validated['role_id']) : null;

        // The base role is what routing and navigation still key off, so a
        // role whose base doesn't match the account would put someone in an
        // area their permissions don't cover.
        if ($role && $role->base_role !== $user->role) {
            throw ValidationException::withMessages([
                'role_id' => ["{$role->name} is a {$role->base_role} role and cannot be given to a {$user->role} account."],
            ]);
        }

        $user->update(['role_id' => $role?->id]);

        activity_log('user.role_assigned', $user, [
            'user' => $user->name,
            'role' => $role?->name ?? 'Default permissions',
        ]);

        return response()->json($user->fresh()->load('assignedRole'));
    }

    private function validateRole(Request $request, ?Role $role = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('roles', 'name')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'base_role' => ['required', 'in:admin,assessor,student'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permissions::all())],
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $n = 2;

        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}
