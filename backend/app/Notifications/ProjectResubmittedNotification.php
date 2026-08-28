<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notifies the assessor who sent a project back for refinement once the
 * student resubmits it. In-app only, same reasoning as
 * ProjectSubmittedNotification.
 */
class ProjectResubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(protected Project $project) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'project_resubmitted',
            'kind' => 'resubmitted',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
        ];
    }
}
