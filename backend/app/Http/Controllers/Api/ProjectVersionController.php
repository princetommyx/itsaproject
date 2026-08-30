<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectVersion;
use App\Services\ProjectVersioning;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Read access to a project's submission history, and the side-by-side
 * comparison built from it.
 *
 * Every role that can see a project can see its history: the student needs to
 * know what they already submitted, and the reviewers need to check whether
 * the feedback was acted on. Who may see which project is the only question,
 * and it's the same question the project pages already answer.
 */
class ProjectVersionController extends Controller
{
    public function __construct(private ProjectVersioning $versioning) {}

    public function index(Request $request, Project $project)
    {
        $this->authorizeAccess($request, $project);

        return response()->json(
            $project->versions()->with(['submitter:id,name', 'reviewer:id,name', 'documents.uploader:id,name'])->get()
        );
    }

    /**
     * Two versions of the same stage, side by side.
     *
     * Defaults to the newest version against the one before it, which is the
     * comparison a reviewer wants on a resubmission — did they address the
     * feedback? Either side can be named explicitly to look further back.
     */
    public function compare(Request $request, Project $project)
    {
        $this->authorizeAccess($request, $project);

        $validated = $request->validate([
            'current' => ['sometimes', 'integer'],
            'previous' => ['sometimes', 'integer'],
        ]);

        $current = isset($validated['current'])
            ? $this->versionOrFail($project, $validated['current'])
            : $project->currentVersion();

        if (! $current) {
            throw ValidationException::withMessages([
                'current' => ['This project has no submissions to compare yet.'],
            ]);
        }

        $previous = isset($validated['previous'])
            ? $this->versionOrFail($project, $validated['previous'])
            : $this->versioning->comparisonPair($project, $current)['previous'];

        $relations = ['submitter:id,name', 'reviewer:id,name', 'documents.uploader:id,name'];

        return response()->json([
            'project' => $project->only(['id', 'title', 'status', 'stage']),
            'previous' => $previous?->load($relations),
            'current' => $current->load($relations),
            // Computed server-side so every reader sees the same summary,
            // rather than each client deciding for itself what counts as a
            // change.
            'changes' => $previous ? $this->summariseChanges($previous, $current) : null,
        ]);
    }

    /**
     * What actually differs between the two versions.
     *
     * Deliberately coarse — which fields moved, and by how much — rather than
     * a word-level diff. The reviewer reads both panels themselves; this is
     * the pointer that says where to look.
     */
    private function summariseChanges(ProjectVersion $previous, ProjectVersion $current): array
    {
        $changes = [];

        if ($previous->title !== $current->title) {
            $changes[] = 'Title was rewritten.';
        }

        if ($previous->description !== $current->description) {
            $before = mb_strlen($previous->description);
            $after = mb_strlen($current->description);
            $delta = $after - $before;

            $changes[] = match (true) {
                $delta > 200 => 'Description was expanded substantially.',
                $delta < -200 => 'Description was cut down substantially.',
                default => 'Description was revised.',
            };
        }

        $newDocuments = $current->documents->count();
        if ($newDocuments > 0) {
            $changes[] = $newDocuments === 1
                ? 'A new document was uploaded with this version.'
                : "{$newDocuments} new documents were uploaded with this version.";
        }

        if ($changes === []) {
            $changes[] = 'No changes to the title, description, or documents.';
        }

        return $changes;
    }

    private function versionOrFail(Project $project, int $versionId): ProjectVersion
    {
        return $project->versions()->whereKey($versionId)->firstOrFail();
    }

    /**
     * The same access rule the project pages use: a member of the group, the
     * assigned assessor, or any admin.
     */
    private function authorizeAccess(Request $request, Project $project): void
    {
        $user = $request->user();

        $allowed = match ($user->role) {
            'admin' => true,
            'assessor' => $project->assessor_id === $user->id,
            'student' => $project->members()->where('student_id', $user->id)->exists(),
            default => false,
        };

        abort_unless($allowed, 403, 'You do not have access to this project.');
    }
}
