<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Group members are now recorded by Index Number regardless of whether
     * that student has an account yet (student_id is nullable) — the full
     * student roster isn't always imported before groups start forming, so
     * requiring an existing account to add a partner was blocking real use.
     * Exclusivity (one student, one group) is now enforced on university_id
     * instead, since that's always known even for an unregistered student.
     */
    public function up(): void
    {
        Schema::dropIfExists('project_student');

        Schema::create('project_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('university_id')->unique();
            $table->boolean('is_leader')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_student');

        Schema::create('project_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('student_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->boolean('is_leader')->default(false);
            $table->timestamps();
        });
    }
};
