<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Documents belong to the version they were uploaded against, so a
     * comparison can show the files each side actually submitted rather than
     * one flat pile per project.
     *
     * Nullable, and left null for documents uploaded before versions existed:
     * those predate any version to attach them to, and guessing would put a
     * file under a submission it was never part of.
     */
    public function up(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->foreignId('project_version_id')->nullable()->after('project_id')
                ->constrained('project_versions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_version_id');
        });
    }
};
