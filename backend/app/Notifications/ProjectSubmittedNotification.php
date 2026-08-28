<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notifies every admin when a project is submitted for the first time and
 * needs an assessor assigned. In-app only — every admin's inbox getting an
 * email for every submission would be noisy, and the assignments page
 * already surfaces the queue.
 */
class ProjectSubmittedNotification extends Notification
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
            'type' => 'project_submitted',
            'kind' => 'submitted',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
        ];
    }
}
