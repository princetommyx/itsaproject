<?php

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

if (! function_exists('activity_log')) {
    /**
     * Record an administrative action.
     *
     * A helper rather than a service injected everywhere: this is called from
     * the middle of controller actions that are otherwise about something
     * else, and threading a dependency through all of them for one line would
     * obscure what those methods actually do.
     *
     * Deliberately never throws. A failure to write the audit trail must not
     * roll back the action it was describing — losing one log line is bad,
     * failing a student's submission because of it is worse.
     */
    function activity_log(string $action, ?Model $subject = null, array $meta = []): void
    {
        try {
            $user = auth()->user();

            AuditLog::create([
                'user_id' => $user?->id,
                'actor_name' => $user?->name,
                'actor_role' => $user?->role,
                'action' => $action,
                'subject_type' => $subject ? class_basename($subject) : null,
                'subject_id' => $subject?->getKey(),
                'meta' => $meta ?: null,
                'ip_address' => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
