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
    }
}
