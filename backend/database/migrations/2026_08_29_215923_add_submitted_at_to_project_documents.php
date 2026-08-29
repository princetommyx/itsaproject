<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Uploading and submitting are now separate steps. A freshly uploaded
     * document is a draft the group can still swap out; only once they
     * explicitly submit it does it go to the admins.
     *
     * Existing rows are backfilled as submitted, since before this change
     * an upload *was* the submission — leaving them null would silently
     * un-submit work that has already been handed in.
     */
    public function up(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('uploaded_by');
        });

        DB::table('project_documents')->update(['submitted_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->dropColumn('submitted_at');
        });
    }
};
