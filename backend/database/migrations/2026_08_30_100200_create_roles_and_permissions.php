<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Roles an administrator can define, rather than a fixed list baked into
     * the code.
     *
     * Every institution slices this differently — one has project
     * coordinators, another has supervisors distinct from assessors, another
     * wants a read-only external examiner. Hard-coding the list means each of
     * those is a developer request. A role is a named set of permissions, and
     * permissions themselves stay in code because each one guards a specific
     * capability that has to exist to be guarded.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();

            // The base role a holder is treated as for the parts of the app
            // that still branch on admin/assessor/student — routing, the
            // navigation, and which dashboard someone lands on.
            $table->enum('base_role', ['admin', 'assessor', 'student']);

            // The roles the system itself relies on. They can be renamed and
            // their permissions adjusted, but deleting one would leave users
            // with no role at all, so it's refused.
            $table->boolean('is_system')->default(false);

            $table->json('permissions')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            // Nullable, and null means "fall back to the legacy role column".
            // Existing accounts keep working untouched, and an institution
            // that never opens the roles page never notices this exists.
            $table->foreignId('role_id')->nullable()->after('role')
                ->constrained('roles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};
