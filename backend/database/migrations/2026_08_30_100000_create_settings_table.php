<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Everyday configuration an administrator should be able to change
     * without a developer editing code and redeploying — the school's name,
     * its colours, what files a student may upload, when submissions close.
     *
     * A key/value table rather than a column per setting: the set grows every
     * time someone wants one more knob, and a migration per knob is exactly
     * the developer round trip this is meant to remove. Values are JSON so a
     * setting can be a string, a number, a flag, or a list without the store
     * caring which.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
