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
     */
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'System Administrator',
            'email' => 'admin@upsa.edu.gh',
            'password' => Hash::make('password'),
        ]);

        User::factory()->assessor()->create([
            'name' => 'J. Ofoeda',
            'email' => 'j.ofoeda@upsa.edu.gh',
            'password' => Hash::make('password'),
        ]);

        // Dummy student for testing. is_first_login stays true (the
        // factory default) so the first-login password-change guard can
        // be exercised too; the password matches the blueprint's own
        // convention of hashing the DOB as YYYYMMDD.
        User::factory()->student()->create([
            'name' => 'Ama Boateng',
            'university_id' => 'UPSA/1000001',
            'student_email' => 'ama.boateng@example.com',
            'dob' => '2001-03-15',
            'password' => Hash::make('20010315'),
        ]);
    }
}
