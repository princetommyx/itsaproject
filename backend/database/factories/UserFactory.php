<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'university_id' => null,
            'student_email' => null,
            'dob' => null,
            'role' => 'admin',
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'is_first_login' => false,
            'remember_token' => Str::random(10),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
            'university_id' => null,
            'student_email' => null,
        ]);
    }

    public function assessor(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'assessor',
            'university_id' => null,
            'student_email' => null,
        ]);
    }

    public function student(): static
    {
        return $this->state(function (array $attributes) {
            $dob = fake()->date();

            return [
                'role' => 'student',
                'email' => null,
                'university_id' => fake()->unique()->numerify('UPSA/#######'),
                'student_email' => fake()->unique()->safeEmail(),
                'dob' => $dob,
                'password' => Hash::make(str_replace('-', '', $dob)),
                'is_first_login' => true,
            ];
        });
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
