<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who did what, to which thing, and when.
     *
     * Distinct from login_logs, which only records arrivals. This records the
     * decisions — a project approved, a role's permissions widened, a
     * deadline moved — so that when someone asks why a project's status
     * changed there is an answer that doesn't depend on memory.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Nulls on delete rather than cascade: removing a user must not
            // erase the record of what they did.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Denormalised so the entry still names its author after the
            // account is gone.
            $table->string('actor_name')->nullable();
            $table->string('actor_role')->nullable();

            // Dotted, e.g. project.approved, role.updated, settings.updated.
            $table->string('action');

            // What it happened to, when there is one.
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();

            $table->timestamps();

            $table->index('action');
            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
