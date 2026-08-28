<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProjectDecisionNotification extends Notification
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
            ->subject('Project Review Update: '.$this->project->title)
            ->greeting('Hello '.$notifiable->name.',');

        $portalUrl = config('app.frontend_url', config('app.url')).'/student';

        if ($this->project->status === 'approved') {
            return $mail
                ->line('Congratulations! Your project has been approved by your supervisor.')
                ->action('View Project', $portalUrl);
        }

        return $mail
            ->line('Your project requires refinement before it can be approved.')
            ->line('Supervisor feedback: '.$this->project->feedback)
            ->line('Please log in to the portal to make the requested changes and resubmit your project.')
            ->action('Go to Portal', $portalUrl);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'project_decision',
            'kind' => $this->project->status === 'approved' ? 'approved' : 'refine',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
            'status' => $this->project->status,
            'feedback' => $this->project->feedback,
        ];
    }
}
