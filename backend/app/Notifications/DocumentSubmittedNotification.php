<?php

namespace App\Notifications;

use App\Models\ProjectDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notifies every admin when a group submits a document for review. Uploading
 * alone no longer reaches the admins — a group can upload, look at it, swap
 * the file, and only then submit — so this is the point at which the work is
 * actually handed in. In-app only, matching the other admin-wide notices.
 */
class DocumentSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(protected ProjectDocument $document) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $project = $this->document->project;

        return [
            'type' => 'document_submitted',
            'kind' => 'document_submitted',
            'project_id' => $project->id,
            'project_title' => $project->title,
            'document_id' => $this->document->id,
            'document_label' => ProjectDocument::TYPES[$this->document->type] ?? $this->document->type,
        ];
    }
}
