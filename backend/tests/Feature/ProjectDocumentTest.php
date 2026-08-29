<?php

use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function leaderStudent(): User
{
    return User::factory()->student()->create(['is_first_login' => false]);
}

it('lets the group leader upload a document to an editable project', function () {
    Storage::fake('local');

    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $file = UploadedFile::fake()->create('proposal.pdf', 500, 'application/pdf');

    $response = $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", ['type' => 'proposal', 'file' => $file]);

    $response->assertCreated();
    $this->assertDatabaseHas('project_documents', [
        'project_id' => $project->id,
        'type' => 'proposal',
        'original_filename' => 'proposal.pdf',
        'uploaded_by' => $leader->id,
    ]);

    $document = ProjectDocument::first();
    Storage::disk('local')->assertExists($document->stored_path);
});

it('rejects an upload from a non-leader group member', function () {
    $leader = leaderStudent();
    $member = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);
    $project->members()->create(['university_id' => $member->university_id, 'student_id' => $member->id, 'is_leader' => false]);

    $file = UploadedFile::fake()->create('proposal.pdf', 500, 'application/pdf');

    $this->actingAs($member, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", ['type' => 'proposal', 'file' => $file])
        ->assertForbidden();
});

it('lets the leader upload a document once the project topic is approved', function () {
    Storage::fake('local');

    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'approved']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $file = UploadedFile::fake()->create('final_report.pdf', 500, 'application/pdf');

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", ['type' => 'final_report', 'file' => $file])
        ->assertCreated();

    $this->assertDatabaseHas('project_documents', [
        'project_id' => $project->id,
        'type' => 'final_report',
    ]);
});

it('rejects uploads once the project is no longer editable', function () {
    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'pending']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $file = UploadedFile::fake()->create('proposal.pdf', 500, 'application/pdf');

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", ['type' => 'proposal', 'file' => $file])
        ->assertUnprocessable();
});

it('rejects a disallowed file type', function () {
    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    $file = UploadedFile::fake()->create('malware.exe', 500, 'application/x-msdownload');

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/student/projects/{$project->id}/documents", ['type' => 'proposal', 'file' => $file])
        ->assertUnprocessable();
});

it('lets the leader delete a document while the project is editable', function () {
    Storage::fake('local');

    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);
    $document = $project->documents()->create([
        'type' => 'proposal',
        'original_filename' => 'proposal.pdf',
        'stored_path' => 'project-documents/1/proposal.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 1000,
        'uploaded_by' => $leader->id,
    ]);

    $this->actingAs($leader, 'sanctum')
        ->deleteJson("/api/student/projects/{$project->id}/documents/{$document->id}")
        ->assertOk();

    $this->assertDatabaseMissing('project_documents', ['id' => $document->id]);
});

it('lets the owning student, the assigned assessor, and any admin download a document', function () {
    Storage::fake('local');

    $leader = leaderStudent();
    $assessor = User::factory()->assessor()->create();
    $otherAssessor = User::factory()->assessor()->create();
    $admin = User::factory()->admin()->create();

    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'pending', 'assessor_id' => $assessor->id]);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    Storage::disk('local')->put('project-documents/1/proposal.pdf', 'fake content');
    $document = $project->documents()->create([
        'type' => 'proposal',
        'original_filename' => 'proposal.pdf',
        'stored_path' => 'project-documents/1/proposal.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 1000,
        'uploaded_by' => $leader->id,
    ]);

    $this->actingAs($leader, 'sanctum')->get("/api/documents/{$document->id}/download")->assertOk();
    $this->actingAs($assessor, 'sanctum')->get("/api/documents/{$document->id}/download")->assertOk();
    $this->actingAs($admin, 'sanctum')->get("/api/documents/{$document->id}/download")->assertOk();
    $this->actingAs($otherAssessor, 'sanctum')->get("/api/documents/{$document->id}/download")->assertForbidden();
});

it('rejects document types that are no longer part of the submission flow', function () {
    $leader = leaderStudent();
    $project = Project::create(['title' => 'T', 'description' => 'D', 'status' => 'draft']);
    $project->members()->create(['university_id' => $leader->university_id, 'student_id' => $leader->id, 'is_leader' => true]);

    // Only the proposal and the final project work document are submitted
    // through the system now; the old per-chapter/slides/zip types are gone.
    foreach (['chapter_1', 'chapter_5', 'presentation', 'source_code', 'supporting'] as $retired) {
        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $this->actingAs($leader, 'sanctum')
            ->postJson("/api/student/projects/{$project->id}/documents", ['type' => $retired, 'file' => $file])
            ->assertUnprocessable();
    }

    expect(array_keys(ProjectDocument::TYPES))->toBe(['proposal', 'final_report']);
});
