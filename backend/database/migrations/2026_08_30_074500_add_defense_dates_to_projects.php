<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Defense slots are scheduled per group rather than once for the whole
     * cohort: every group defends at its own time, and the export is a row
     * per group, so the date has to travel with the project to be useful
     * there. An admin running a single sitting can still set the same date
     * on every group.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dateTime('proposal_defense_at')->nullable()->after('feedback');
            $table->dateTime('final_defense_at')->nullable()->after('proposal_defense_at');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['proposal_defense_at', 'final_defense_at']);
        });
    }
};
