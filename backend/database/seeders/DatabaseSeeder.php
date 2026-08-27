<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Uses updateOrCreate (keyed on the login identifier) rather than
     * create() so this is safe to run on every deploy — start.sh runs it
     * on every container boot, and re-running create() would crash on
     * the unique email/university_id constraint.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@upsa.edu.gh'],
            [
                'name' => 'System Administrator',
                'role' => 'admin',
                'password' => Hash::make('password'),
                'is_first_login' => false,
            ]
        );

        User::updateOrCreate(
            ['email' => 'j.ofoeda@upsa.edu.gh'],
            [
                'name' => 'J. Ofoeda',
                'role' => 'assessor',
                'password' => Hash::make('password'),
                'is_first_login' => false,
            ]
        );

        // Dummy student for testing. is_first_login is false so this
        // seeded account can log straight into the dashboard for quick
        // manual testing, skipping the forced password-change screen.
        // That guard is still fully enforced for real students created
        // via CSV import (see AdminController::importStudents).
        User::updateOrCreate(
            ['university_id' => 'UPSA/1000001'],
            [
                'name' => 'Ama Boateng',
                'role' => 'student',
                'student_email' => 'ama.boateng@example.com',
                'dob' => '2001-03-15',
                'password' => Hash::make('20010315'),
                'is_first_login' => false,
            ]
        );
    }
}
