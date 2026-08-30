<?php

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Services\Permissions;
use App\Services\Settings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
    $this->seed(Database\Seeders\RoleSeeder::class);
});

// ---------------------------------------------------------------- settings

it('serves declared defaults before anything has been configured', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/settings');

    $response->assertOk();
    expect($response->json('settings.primary_color'))->toBe('#0f2d5c');
    expect($response->json('settings.allowed_file_types'))->toBe(['pdf', 'doc', 'docx']);
    expect($response->json('settings.max_file_size_mb'))->toBe(20);
});

it('saves settings and reports which ones actually changed', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', [
        'school_name' => 'UPSA',
        'primary_color' => '#123456',
        // Unchanged: already the default, so it should not count as a change.
        'max_file_size_mb' => 20,
    ]);

    $response->assertOk();
    expect($response->json('settings.primary_color'))->toBe('#123456');
    expect($response->json('changed'))->toEqualCanonicalizing(['school_name', 'primary_color']);
});

// An open key/value endpoint would let any client write anything and leave
// nothing downstream able to trust what it read back.
it('ignores keys that are not declared in the schema', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/settings', ['is_admin' => true, 'school_name' => 'UPSA'])
        ->assertOk();

    expect(Setting::find('is_admin'))->toBeNull();
    expect(Setting::find('school_name')->value)->toBe('UPSA');
});

it('rejects a colour that is not a hex value', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/settings', ['primary_color' => 'javascript:alert(1)'])
        ->assertStatus(422);
});

it('gives every signed-in user branding and submission limits, and nothing else', function () {
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $response = $this->actingAs($student, 'sanctum')->getJson('/api/settings');

    $response->assertOk();
    $response->assertJsonStructure(['primary_color', 'font_family', 'school_name', 'max_file_size_mb']);
    expect($response->json())->not->toHaveKey('email_notifications');
});

it('applies the configured file rules to uploads', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', [
        'allowed_file_types' => ['pdf'],
        'max_file_size_mb' => 1,
    ])->assertOk();

    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = App\Models\Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create([
        'university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true,
    ]);

    // .docx is no longer allowed.
    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", [
            'type' => 'proposal',
            'file' => UploadedFile::fake()->create('p.docx', 100),
        ])
        ->assertStatus(422);

    // And the size cap follows the setting, not the old hard-coded 20MB.
    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", [
            'type' => 'proposal',
            'file' => UploadedFile::fake()->create('p.pdf', 2048, 'application/pdf'),
        ])
        ->assertStatus(422);
});

it('closes submissions once the deadline for that stage has passed', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/settings', ['proposal_deadline' => now()->subDay()->toDateTimeString()])
        ->assertOk();

    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = App\Models\Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create([
        'university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true,
    ]);

    $response = $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", [
            'type' => 'proposal',
            'file' => UploadedFile::fake()->create('p.pdf', 100, 'application/pdf'),
        ]);

    $response->assertStatus(422);
    expect($response->json('errors.file.0'))->toContain('deadline');
});

// ------------------------------------------------------------------- roles

it('lets an admin build a role from the permission catalogue', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/roles', [
        'name' => 'External Examiner',
        'description' => 'Reads projects without deciding on them.',
        'base_role' => 'assessor',
        'permissions' => ['projects.view_assigned', 'projects.compare'],
    ]);

    $response->assertCreated();
    expect($response->json('slug'))->toBe('external-examiner');
    expect($response->json('is_system'))->toBeFalse();
});

it('refuses a permission that does not exist', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/roles', [
            'name' => 'Ghost', 'base_role' => 'admin', 'permissions' => ['everything.always'],
        ])
        ->assertStatus(422);
});

it('will not delete a built-in role', function () {
    $admin = User::factory()->admin()->create();
    $system = Role::where('slug', 'administrator')->first();

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/admin/roles/{$system->id}")
        ->assertStatus(422);

    expect(Role::find($system->id))->not->toBeNull();
});

it('returns holders of a deleted role to their default permissions', function () {
    $admin = User::factory()->admin()->create();
    $role = Role::where('slug', 'supervisor')->first();
    $assessor = User::factory()->assessor()->create(['role_id' => $role->id]);

    expect($assessor->fresh()->hasPermission('projects.review'))->toBeFalse();

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/admin/roles/{$role->id}")
        ->assertOk();

    $assessor = $assessor->fresh();
    expect($assessor->role_id)->toBeNull();
    expect($assessor->hasPermission('projects.review'))->toBeTrue();
});

// The base role decides which area of the app someone lands in, so a mismatch
// would drop them somewhere their permissions don't cover.
it('refuses a role whose base does not match the account', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);
    $assessorRole = Role::where('slug', 'supervisor')->first();

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/admin/users/{$student->id}/role", ['role_id' => $assessorRole->id])
        ->assertStatus(422);
});

it('falls back to the base role when an account has none assigned', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    expect($admin->hasPermission('settings.manage'))->toBeTrue();
    expect($assessor->hasPermission('projects.review'))->toBeTrue();
    expect($assessor->hasPermission('settings.manage'))->toBeFalse();
    expect($student->hasPermission('project.submit'))->toBeTrue();
    expect($student->hasPermission('projects.view_all'))->toBeFalse();
});

// The whole point of the builder: an admin-area role that can't rewrite the
// system's configuration.
it('stops an admin-area role without settings.manage from changing settings', function () {
    $coordinatorRole = Role::where('slug', 'project-coordinator')->first();
    $coordinator = User::factory()->admin()->create(['role_id' => $coordinatorRole->id]);

    $this->actingAs($coordinator, 'sanctum')
        ->putJson('/api/admin/settings', ['school_name' => 'Nope'])
        ->assertForbidden();

    // But they can still do the job the role exists for.
    $this->actingAs($coordinator, 'sanctum')
        ->getJson('/api/admin/projects')
        ->assertOk();
});

it('reports a user\'s permissions when they sign in', function () {
    $role = Role::where('slug', 'project-coordinator')->first();
    $admin = User::factory()->admin()->create([
        'role_id' => $role->id,
        'password' => Illuminate\Support\Facades\Hash::make('Secret#2026'),
        'is_first_login' => false,
    ]);

    $response = $this->postJson('/api/login', [
        'identifier' => $admin->email,
        'password' => 'Secret#2026',
    ]);

    $response->assertOk();
    expect($response->json('user.role_name'))->toBe('Project Coordinator');
    expect($response->json('user.permissions'))->toContain('projects.assign_assessor');
    expect($response->json('user.permissions'))->not->toContain('settings.manage');
});

// ------------------------------------------------------------- audit logs

it('records who changed the settings and which keys moved', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/settings', ['school_name' => 'UPSA'])
        ->assertOk();

    $entry = AuditLog::where('action', 'settings.updated')->latest()->first();
    expect($entry->actor_name)->toBe($admin->name);
    expect($entry->meta['keys'])->toBe(['school_name']);
});

it('records a project decision against the project it was made on', function () {
    $admin = User::factory()->admin()->create();
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = App\Models\Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create([
        'university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true,
    ]);
    app(App\Services\ProjectVersioning::class)->openInitial($project->fresh());
    $project->versions()->first()->update(['status' => 'submitted', 'submitted_at' => now()]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", [
            'decision' => 'refine', 'feedback' => 'Narrow the scope.',
        ])
        ->assertOk();

    $entry = AuditLog::where('action', 'project.revision_requested')->latest()->first();
    expect($entry->subject_type)->toBe('Project');
    expect($entry->subject_id)->toBe($project->id);
    expect($entry->meta['version'])->toBe('v1.0');
});

it('serves the audit trail to admins only', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($admin, 'sanctum')->getJson('/api/admin/audit-logs')->assertOk();
    $this->actingAs($assessor, 'sanctum')->getJson('/api/admin/audit-logs')->assertForbidden();
});

it('exposes every catalogued permission through the builder', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/roles');

    $response->assertOk();
    $catalogue = $response->json('catalogue');
    $flat = collect($catalogue)->flatMap(fn ($group) => array_keys($group))->all();
    expect($flat)->toEqualCanonicalizing(Permissions::all());
});

// ------------------------------------------------ permission catalogue

it('lists every permission with how many roles hold it', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/permissions');

    $response->assertOk();
    expect($response->json('permissions'))->toHaveCount(count(Permissions::all()));

    $viewAll = collect($response->json('permissions'))->firstWhere('key', 'projects.view_all');
    expect($viewAll['name'])->toBe('View every project');
    expect($viewAll['description'])->not->toBeNull();
    expect($viewAll['customised'])->toBeFalse();
    // Administrator and Project Coordinator both hold it in the seeded set.
    expect($viewAll['role_count'])->toBeGreaterThan(0);
    expect($viewAll['roles'])->toContain('Administrator');
});

it('lets an admin reword a permission without touching its key', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/permissions/projects.view_all', [
            'name' => 'View all supervisions',
            'description' => 'See every supervision in the department.',
        ]);

    $response->assertOk();
    expect($response->json('key'))->toBe('projects.view_all');
    expect($response->json('name'))->toBe('View all supervisions');
    expect($response->json('default_name'))->toBe('View every project');
    expect($response->json('customised'))->toBeTrue();

    // The reworded label reaches the role builder too.
    $builder = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/roles')->json('catalogue');
    expect($builder['Projects']['projects.view_all'])->toBe('View all supervisions');
});

// The key is what every can.do: route checks. If rewording could change it,
// a permission would be silently revoked everywhere it is used.
it('never lets the key be changed through the rewording endpoint', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/permissions/projects.view_all', [
            'key' => 'projects.something_else',
            'name' => 'Renamed',
        ])
        ->assertOk();

    expect(Permissions::exists('projects.view_all'))->toBeTrue();
    expect(Permissions::exists('projects.something_else'))->toBeFalse();

    // And the role that holds it still does.
    $role = Role::where('slug', 'administrator')->first();
    expect($role->hasPermission('projects.view_all'))->toBeTrue();
});

it('rejects a permission that does not exist', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/permissions/made.up', ['name' => 'Nope'])
        ->assertNotFound();
});

it('resets a reworded permission back to the built-in wording', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/permissions/roles.manage', ['name' => 'Custom wording'])
        ->assertOk();

    $response = $this->actingAs($admin, 'sanctum')
        ->deleteJson('/api/admin/permissions/roles.manage');

    $response->assertOk();
    expect($response->json('name'))->toBe('Create and edit roles');
    expect($response->json('customised'))->toBeFalse();
});

it('keeps the permission catalogue behind roles.manage', function () {
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($assessor, 'sanctum')
        ->getJson('/api/admin/permissions')
        ->assertForbidden();
});
