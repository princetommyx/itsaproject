<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProjectAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(protected Project $project) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Project Assigned for Review')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('A new project has been assigned to you for assessment.')
            ->line('Title: '.$this->project->title)
            ->action('Review Project', config('app.frontend_url', config('app.url')).'/assessor/projects/'.$this->project->id);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'project_assigned',
            'kind' => 'assigned',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
        ];
    }
}
