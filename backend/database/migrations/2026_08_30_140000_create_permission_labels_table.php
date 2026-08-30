<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An institution's own wording for a permission.
     *
     * The permissions themselves stay in code — each key is checked by a
     * `can.do:` route, so renaming one would silently revoke it. What an
     * institution can reasonably want to change is how a permission is
     * described to whoever is building a role: "View every project" might
     * be "View all supervisions" somewhere else.
     *
     * Only rows that have actually been reworded exist here; everything else
     * falls back to the wording in the code catalogue.
     */
    public function up(): void
    {
        Schema::create('permission_labels', function (Blueprint $table) {
            $table->string('permission')->primary();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_labels');
    }
};
