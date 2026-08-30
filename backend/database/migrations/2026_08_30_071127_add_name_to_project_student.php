<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A group member added before their account exists was recorded by Index
     * Number alone, so the group list could only show the number — nobody
     * could tell who it was. This holds the name the group typed in.
     *
     * Nullable: it's a fallback label, not a source of truth. Once that
     * student is imported and links up, their real account name takes over
     * and this is ignored.
     */
    public function up(): void
    {
        Schema::table('project_student', function (Blueprint $table) {
            $table->string('name')->nullable()->after('university_id');
        });
    }

    public function down(): void
    {
        Schema::table('project_student', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }
};
