<?php

use App\Models\Project;
use App\Models\ProjectVersion;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

function projectFor(User $leader, array $attributes = []): Project
{
    $project = Project::create(array_merge(
        ['title' => 'Smart Campus Attendance', 'description' => 'Original scope.', 'status' => 'draft'],
        $attributes
    ));
    $project->members()->create([
        'university_id' => $leader->university_id,
        'student_id' => $leader->id,
        'is_leader' => true,
    ]);

    // Mirror what creating a project through the API does, so tests exercise
    // the same starting state the app produces.
    app(App\Services\ProjectVersioning::class)->openInitial($project);

    return $project->fresh();
}

/** The v1.0 draft the helper opened, for tests that need it in another state. */
function firstVersion(Project $project): ProjectVersion
{
    return $project->versions()->where('sequence', 1)->firstOrFail();
}

it('opens a first version when a project is created', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);

    $this->actingAs($leader, 'sanctum')
        ->postJson('/api/student/projects', ['title' => 'Attendance System', 'description' => 'Scope.'])
        ->assertCreated();

    $version = Project::first()->versions()->first();

    expect($version->sequence)->toBe(1);
    expect($version->label)->toBe('v1.0');
    expect($version->status)->toBe('draft');
    expect($version->title)->toBe('Attendance System');
});

it('keeps the open draft in step while the student edits', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);

    $this->actingAs($leader, 'sanctum')
        ->putJson("/api/student/projects/{$project->id}", ['description' => 'Narrowed scope.'])
        ->assertOk();

    expect($project->versions()->first()->description)->toBe('Narrowed scope.');
});

// The whole feature rests on this: the version an assessor objected to has to
// survive the resubmission that answers it.
it('preserves a disapproved version and opens a new one to revise into', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $assessor = User::factory()->assessor()->create();
    $project = projectFor($leader, ['status' => 'pending', 'assessor_id' => $assessor->id]);

    // v1.0 is what was reviewed.
    firstVersion($project)->update([
        'status' => 'under_review',
        'submitted_by' => $leader->id,
        'submitted_at' => now(),
    ]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", [
            'decision' => 'refine',
            'feedback' => 'Your project scope is too broad.',
            'required_changes' => ['Narrow project scope', 'Revise Objective 3'],
        ])
        ->assertOk();

    $versions = $project->fresh()->versions;
    expect($versions)->toHaveCount(2);

    $reviewed = $versions->firstWhere('sequence', 1);
    expect($reviewed->status)->toBe('revision_required');
    expect($reviewed->description)->toBe('Original scope.');
    expect($reviewed->feedback)->toBe('Your project scope is too broad.');
    expect($reviewed->required_changes)->toBe(['Narrow project scope', 'Revise Objective 3']);
    expect($reviewed->reviewed_by)->toBe($assessor->id);

    $fresh = $versions->firstWhere('sequence', 2);
    expect($fresh->status)->toBe('draft');
    expect($fresh->label)->toBe('v1.1');

    // The student now revises, and the reviewed version must not move.
    $this->actingAs($leader, 'sanctum')
        ->putJson("/api/student/projects/{$project->id}", ['description' => 'Attendance only.'])
        ->assertOk();

    expect($project->versions()->where('sequence', 1)->first()->description)->toBe('Original scope.');
    expect($project->versions()->where('sequence', 2)->first()->description)->toBe('Attendance only.');
});

it('stamps the open draft on resubmission rather than creating another one', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader, ['status' => 'refine']);

    firstVersion($project)->update([
        'status' => 'revision_required', 'description' => 'Old.', 'submitted_at' => now(),
    ]);
    $project->versions()->create([
        'stage' => 'proposal', 'sequence' => 2, 'status' => 'draft',
        'title' => 'T', 'description' => 'New.',
    ]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($project->fresh()->versions)->toHaveCount(2);
    expect($project->versions()->where('sequence', 2)->first()->status)->toBe('submitted');
});

it('opens the final stage at v1.0 when a proposal is approved', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $assessor = User::factory()->assessor()->create();
    $project = projectFor($leader, ['status' => 'pending', 'assessor_id' => $assessor->id]);

    firstVersion($project)->update(['status' => 'under_review', 'submitted_at' => now()]);

    $this->actingAs($assessor, 'sanctum')
        ->postJson("/api/assessor/projects/{$project->id}/decide", ['decision' => 'approved'])
        ->assertOk();

    $project->refresh();
    expect($project->stage)->toBe('final');

    $final = $project->versions()->where('stage', 'final')->first();
    expect($final->sequence)->toBe(1);
    expect($final->status)->toBe('draft');

    // The approved proposal keeps its own numbering and decision.
    $proposal = $project->versions()->where('stage', 'proposal')->first();
    expect($proposal->status)->toBe('approved');
});

it('numbers each stage independently', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);

    firstVersion($project)->update(['status' => 'approved']);
    $project->versions()->create(['stage' => 'proposal', 'sequence' => 2, 'status' => 'approved', 'title' => 'T', 'description' => 'D']);
    $project->update(['stage' => 'final']);

    app(App\Services\ProjectVersioning::class)->openInitial($project->fresh());

    expect($project->versions()->where('stage', 'final')->first()->label)->toBe('v1.0');
});

it('compares the newest version against the one before it', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $assessor = User::factory()->assessor()->create();
    $project = projectFor($leader, ['status' => 'pending', 'assessor_id' => $assessor->id]);

    firstVersion($project)->update([
        'status' => 'revision_required',
        'title' => 'Smart Campus Platform', 'description' => 'A complete university platform.',
        'feedback' => 'Scope is too broad.', 'submitted_at' => now(),
    ]);
    $project->versions()->create([
        'stage' => 'proposal', 'sequence' => 2, 'status' => 'under_review',
        'title' => 'Smart Campus Attendance',
        'description' => str_repeat('An attendance management system that records and reports. ', 10),
        'submitted_at' => now(),
    ]);

    $response = $this->actingAs($assessor, 'sanctum')->getJson("/api/projects/{$project->id}/compare");

    $response->assertOk();
    expect($response->json('previous.label'))->toBe('v1.0');
    expect($response->json('previous.feedback'))->toBe('Scope is too broad.');
    expect($response->json('current.label'))->toBe('v1.1');
    expect($response->json('changes'))->toContain('Title was rewritten.');
    expect($response->json('changes'))->toContain('Description was expanded substantially.');
});

it('reports a first submission as having nothing to compare against', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);

    $response = $this->actingAs($leader, 'sanctum')->getJson("/api/projects/{$project->id}/compare");

    $response->assertOk();
    expect($response->json('previous'))->toBeNull();
    expect($response->json('current.label'))->toBe('v1.0');
    expect($response->json('changes'))->toBeNull();
});

it('lets a student read their own history but not another group\'s', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $outsider = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);

    $this->actingAs($leader, 'sanctum')
        ->getJson("/api/projects/{$project->id}/versions")
        ->assertOk()
        ->assertJsonCount(1);

    $this->actingAs($outsider, 'sanctum')
        ->getJson("/api/projects/{$project->id}/versions")
        ->assertForbidden();
});

it('refuses an assessor a project that is not theirs', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $other = User::factory()->assessor()->create();
    $project = projectFor($leader);

    $this->actingAs($other, 'sanctum')
        ->getJson("/api/projects/{$project->id}/compare")
        ->assertForbidden();
});

it('attaches an uploaded document to the version it was uploaded against', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);
    $draft = $project->versions()->first();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", [
            'type' => 'proposal',
            'file' => Illuminate\Http\UploadedFile::fake()->create('proposal.pdf', 100, 'application/pdf'),
        ])
        ->assertCreated();

    expect($project->documents()->first()->project_version_id)->toBe($draft->id);
});

it('never lets a reviewed version be edited', function () {
    $version = new ProjectVersion(['status' => 'revision_required']);

    expect($version->isEditable())->toBeFalse();
    expect((new ProjectVersion(['status' => 'draft']))->isEditable())->toBeTrue();
});

// The assessor who asked for the changes is the only person the comparison
// means anything to. Sending a resubmission to the unassigned queue used to
// notify them of a version they could no longer open.
it('returns a resubmission to the assessor who requested it', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $assessor = User::factory()->assessor()->create();
    $project = projectFor($leader, ['status' => 'refine', 'assessor_id' => $assessor->id]);

    firstVersion($project)->update(['status' => 'revision_required', 'submitted_at' => now()]);
    $project->versions()->create([
        'stage' => 'proposal', 'sequence' => 2, 'status' => 'draft',
        'title' => 'T', 'description' => 'Revised.',
    ]);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    $project->refresh();
    expect($project->assessor_id)->toBe($assessor->id);
    expect($project->status)->toBe('pending');
    expect($project->versions()->where('sequence', 2)->first()->status)->toBe('under_review');

    // And they can actually open the comparison they were notified about.
    $this->actingAs($assessor, 'sanctum')
        ->getJson("/api/projects/{$project->id}/compare")
        ->assertOk()
        ->assertJsonPath('previous.label', 'v1.0')
        ->assertJsonPath('current.label', 'v1.1');
});

it('still queues a first submission for assignment', function () {
    $leader = User::factory()->student()->create(['is_first_login' => false]);
    $project = projectFor($leader);

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/submit")
        ->assertOk();

    expect($project->fresh()->status)->toBe('submitted_unassigned');
});
