<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to every member of a group when an administrator sets or changes
 * their defense dates. A date the group doesn't know about is worthless,
 * so this goes out on every change, not just the first one.
 */
class DefenseScheduledNotification extends Notification
{
    use Queueable;

    public function __construct(protected Project $project) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Your project defense has been scheduled')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('Defense dates have been set for your project: '.$this->project->title);

        if ($this->project->proposal_defense_at) {
            $mail->line('Proposal Defense: '.$this->project->proposal_defense_at->format('l, j F Y \a\t g:ia'));
        }

        if ($this->project->final_defense_at) {
            $mail->line('Project Defense: '.$this->project->final_defense_at->format('l, j F Y \a\t g:ia'));
        }

        return $mail->action('View My Project', config('app.frontend_url', config('app.url')).'/student');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'defense_scheduled',
            'kind' => 'defense_scheduled',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
            'proposal_defense_at' => $this->project->proposal_defense_at?->toIso8601String(),
            'final_defense_at' => $this->project->final_defense_at?->toIso8601String(),
        ];
    }
}
