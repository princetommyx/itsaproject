<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StudentPasswordResetNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reset Your Password - UPSA Project Management System')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('You requested a password reset for your student account.')
            ->line('Your reset token is: '.$this->token)
            ->line('Use your Index Number and this token on the password reset page to set a new password.')
            ->line('If you did not request this, you can ignore this email.');
    }
}
