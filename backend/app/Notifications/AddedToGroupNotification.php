<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent when an administrator places a student into a group themselves.
 * Unlike joining through a group leader, the student had no part in this,
 * so telling them is the only way they find out.
 */
class AddedToGroupNotification extends Notification
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
            ->subject('You have been added to a project group')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('An administrator has added you to a final year project group.')
            ->line('Project: '.$this->project->title)
            ->action('View My Project', config('app.frontend_url', config('app.url')).'/student');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'added_to_group',
            'kind' => 'added_to_group',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
        ];
    }
}
