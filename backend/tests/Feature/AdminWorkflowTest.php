<?php

use App\Models\LoginLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

it('imports students from a CSV with hashed DOB as the default password', function () {
    $admin = User::factory()->admin()->create();

    $csv = "Student Name,Index Number,Email,Date of Birth\n".
        "Ama Boateng,UPSA/1000001,ama@example.com,2000-05-10\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/students/import', ['file' => $file]);

    $response->assertOk();
    $this->assertDatabaseHas('users', [
        'university_id' => 'UPSA/1000001',
        'role' => 'student',
        'is_first_login' => true,
    ]);

    $student = User::where('university_id', 'UPSA/1000001')->first();
    expect(Hash::check('20000510', $student->password))->toBeTrue();
});

it('lets an admin assign an assessor to an unassigned project', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $leader = User::factory()->student()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/assign", ['assessor_id' => $assessor->id]);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('pending');
    expect($project->fresh()->assessor_id)->toBe($assessor->id);

    Notification::assertSentTo($assessor, \App\Notifications\ProjectAssignedNotification::class);
});

it('lets an assessor see and read their in-app assignment notification', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $leader = User::factory()->student()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/assign", ['assessor_id' => $assessor->id])
        ->assertOk();

    $response = $this->actingAs($assessor, 'sanctum')->getJson('/api/assessor/notifications');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['data'])->toMatchArray(['type' => 'project_assigned', 'kind' => 'assigned', 'project_id' => $project->id]);
    expect($response->json()[0]['read_at'])->toBeNull();

    $notificationId = $response->json()[0]['id'];

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/notifications/{$notificationId}/read")
        ->assertOk();

    expect($assessor->notifications()->first()->read_at)->not->toBeNull();
});

it('lets an admin see their in-app new-submission notification', function () {
    $admin = User::factory()->admin()->create();
    $leader = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/notifications');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['data'])->toMatchArray(['type' => 'project_submitted', 'kind' => 'submitted']);
});

it('returns aggregate dashboard stats', function () {
    $admin = User::factory()->admin()->create();

    Project::create(['title' => 'A', 'description' => 'D', 'status' => 'approved']);
    Project::create(['title' => 'B', 'description' => 'D', 'status' => 'pending']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');

    $response->assertOk()->assertJsonPath('approved', 1)->assertJsonPath('pending', 1);
});

it('lists all submitted projects for admin oversight, excluding drafts', function () {
    $admin = User::factory()->admin()->create();

    Project::create(['title' => 'Draft', 'description' => 'D', 'status' => 'draft']);
    Project::create(['title' => 'Pending', 'description' => 'D', 'status' => 'pending']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/projects');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json()[0]['title'])->toBe('Pending');
});

it('lets an admin approve a pending project as a backup to the assessor', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create([
        'title' => 'T',
        'description' => 'D',
        'status' => 'pending',
        'assessor_id' => $assessor->id,
    ]);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved']);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('approved');
    Notification::assertSentTo($student, \App\Notifications\ProjectDecisionNotification::class);
});

it('lets an admin decide directly on a project that has not been assigned an assessor yet', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['is_first_login' => false]);

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create(['university_id' => $student->university_id, 'student_id' => $student->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved']);

    $response->assertOk();
    expect($project->fresh()->status)->toBe('approved');
});

it('prevents an admin from deciding on a project that is not awaiting review', function () {
    $admin = User::factory()->admin()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", ['decision' => 'approved'])
        ->assertUnprocessable();
});

it('lists login logs newest first with the acting user eager loaded', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $older = LoginLog::create(['user_id' => $student->id, 'login_time' => now()->subHour()]);
    $newer = LoginLog::create(['user_id' => $student->id, 'login_time' => now()]);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/login-logs');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids->first())->toBe($newer->id);
    expect($ids->last())->toBe($older->id);
    expect($response->json('data.0.user.id'))->toBe($student->id);
});

it('reports database round-trip timings to admins only', function () {
    $admin = User::factory()->admin()->create();
    $assessor = User::factory()->assessor()->create();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/diagnostics');

    $response->assertOk()->assertJsonStructure([
        'db_driver',
        'query_ms' => ['median', 'min', 'max'],
        'verdict',
    ]);

    // Timings only — never anything that identifies or reaches the database.
    $body = $response->json();
    expect(json_encode($body))->not->toContain('password');
    expect($body)->not->toHaveKey('host');

    $this->actingAs($assessor, 'sanctum')->getJson('/api/admin/diagnostics')->assertForbidden();
});

it('lists only students, with their project, and never leaks password hashes', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->assessor()->create(['name' => 'Zed Assessor']);

    $inGroup = User::factory()->student()->create(['name' => 'Kwame Mensah', 'university_id' => 'UPSA/1000002']);
    User::factory()->student()->create(['name' => 'Akosua Darko', 'university_id' => 'UPSA/1000003']);

    $project = Project::create(['title' => 'Campus Transport', 'description' => 'D', 'status' => 'pending']);
    $project->members()->create(['university_id' => $inGroup->university_id, 'student_id' => $inGroup->id, 'is_leader' => true]);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/students');

    $response->assertOk();
    $rows = $response->json('data');

    // Staff must not appear in a student roster.
    expect(collect($rows)->pluck('name'))->not->toContain('Zed Assessor');
    expect($rows)->toHaveCount(2);

    // Alphabetical, so the roster is scannable.
    expect($rows[0]['name'])->toBe('Akosua Darko');

    // The project comes back eager-loaded rather than needing a call per row.
    $kwame = collect($rows)->firstWhere('university_id', 'UPSA/1000002');
    expect($kwame['projects'][0]['title'])->toBe('Campus Transport');

    expect(json_encode($rows))->not->toContain('password');
});

it('searches the whole student roster by name or index number', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->student()->create(['name' => 'Kwame Mensah', 'university_id' => 'UPSA/1000002']);
    User::factory()->student()->create(['name' => 'Akosua Darko', 'university_id' => 'UPSA/1000003']);

    $byName = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/students?search=Akosua');
    expect($byName->json('data'))->toHaveCount(1);
    expect($byName->json('data.0.name'))->toBe('Akosua Darko');

    $byIndex = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/students?search=1000002');
    expect($byIndex->json('data'))->toHaveCount(1);
    expect($byIndex->json('data.0.name'))->toBe('Kwame Mensah');

    $noMatch = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/students?search=zzzz');
    expect($noMatch->json('data'))->toHaveCount(0);
});

it('does not expose the student roster to assessors', function () {
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($assessor, 'sanctum')->getJson('/api/admin/students')->assertForbidden();
});

it('decides on a project whose group member has no email address', function () {
    // Deliberately NOT Notification::fake(): faking notifications skips the
    // channel entirely, which is why this bug lived here undetected. Mail::fake
    // stops anything leaving while still running the real mail routing.
    Illuminate\Support\Facades\Mail::fake();

    $admin = User::factory()->admin()->create();

    // A student imported from a roll that carried no email address. Both email
    // columns are nullable, so this is ordinary data, not a corrupt row.
    $student = User::factory()->student()->create([
        'is_first_login' => false,
        'student_email' => null,
    ]);

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'submitted_unassigned']);
    $project->members()->create([
        'university_id' => $student->university_id,
        'student_id' => $student->id,
        'is_leader' => true,
    ]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/admin/projects/{$project->id}/decide", [
            'decision' => 'refine',
            'feedback' => 'Please narrow the scope.',
        ])
        ->assertOk();

    expect($project->fresh()->status)->toBe('refine');

    // The decision must still reach them in the app, even with nowhere to mail.
    expect($student->fresh()->notifications()->count())->toBe(1);
});

it('imports staff from a CSV using the DOB as the initial password', function () {
    $admin = User::factory()->admin()->create();

    $csv = "Staff Name,Email,Role,Date of Birth\n".
        "Dr. Ama Serwaa,ama.serwaa@upsa.edu.gh,assessor,1980-04-12\n".
        "Kofi Boateng,kofi.boateng@upsa.edu.gh,admin,1975-11-03\n";

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/staff/import', [
            'file' => UploadedFile::fake()->createWithContent('staff.csv', $csv),
        ]);

    $response->assertOk();
    expect($response->json('created'))->toHaveCount(2);
    expect($response->json('errors'))->toBeEmpty();

    $assessor = User::where('email', 'ama.serwaa@upsa.edu.gh')->first();
    expect($assessor->role)->toBe('assessor');
    // The password is the DOB as YYYYMMDD, and they must change it before use.
    expect(Hash::check('19800412', $assessor->password))->toBeTrue();
    expect($assessor->is_first_login)->toBeTrue();

    expect(User::where('email', 'kofi.boateng@upsa.edu.gh')->first()->role)->toBe('admin');
});

it('reports bad staff rows without failing the whole import', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->assessor()->create(['email' => 'taken@upsa.edu.gh']);

    $csv = "Staff Name,Email,Role,Date of Birth\n".
        "Good Row,good@upsa.edu.gh,assessor,1980-04-12\n".
        "Duplicate,taken@upsa.edu.gh,assessor,1980-04-12\n".
        "Bad Role,badrole@upsa.edu.gh,registrar,1980-04-12\n".
        "Not An Email,nope,assessor,1980-04-12\n".
        // A stray comma: array_combine() throws on a length mismatch, which
        // used to 500 the entire file rather than flagging one row.
        "Stray Comma,stray@upsa.edu.gh,assessor,1980-04-12,oops\n";

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/admin/staff/import', [
            'file' => UploadedFile::fake()->createWithContent('staff.csv', $csv),
        ]);

    $response->assertOk();
    expect($response->json('created'))->toBe(['good@upsa.edu.gh']);
    expect($response->json('errors'))->toHaveCount(4);
    expect(User::where('email', 'badrole@upsa.edu.gh')->exists())->toBeFalse();
    expect(User::where('email', 'stray@upsa.edu.gh')->exists())->toBeFalse();
});

it('does not let an assessor import staff', function () {
    $assessor = User::factory()->assessor()->create();

    $this->actingAs($assessor, 'sanctum')
        ->postJson('/api/admin/staff/import', [
            'file' => UploadedFile::fake()->createWithContent('staff.csv', "Staff Name,Email,Role,Date of Birth\n"),
        ])
        ->assertForbidden();
});
