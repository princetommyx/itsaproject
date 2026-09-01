<?php

use App\Models\User;

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option defines the default authentication "guard" and password
    | reset "broker" for your application. You may change these values
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | Of course, a great default configuration has been defined for you
    | which utilizes session storage plus the Eloquent user provider.
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | Supported: "session"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | If you have multiple user tables or models you may configure multiple
    | providers to represent the model / table. These providers may then
    | be assigned to any extra authentication guards you have defined.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', User::class),
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | The expiry time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    | The throttle setting is the number of seconds a user must wait before
    | generating more password reset tokens. This prevents the user from
    | quickly generating a very large amount of password reset tokens.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the number of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

    /*
    |--------------------------------------------------------------------------
    | Login Throttling
    |--------------------------------------------------------------------------
    |
    | Failed sign-in attempts per minute, counted two ways. 'per_account' is
    | keyed on the submitted identifier together with the client IP and stops
    | someone guessing at one student's password; 'per_ip' is keyed on the IP
    | alone and stops someone walking the index-number range from one host.
    |
    | Successful sign-ins are never counted, which is what makes these numbers
    | safe to keep low: a hall of students behind one NAT'd campus address can
    | all sign in at once without spending any of either budget.
    |
    | There is deliberately no per-identifier-only limit. That one is a weapon
    | — anybody could lock a chosen student out of their own account by failing
    | five sign-ins as them.
    |
    */

    'login_throttle' => [
        'per_account' => (int) env('LOGIN_THROTTLE_PER_ACCOUNT', 5),
        'per_ip' => (int) env('LOGIN_THROTTLE_PER_IP', 20),

        // A flood backstop on the route itself, counting ALL requests to the
        // three unauthenticated auth endpoints. Set well above the two
        // failure budgets above: this one is not the credential-guessing
        // defence, it is there so a request flood cannot pin the CPU on
        // bcrypt. 120/min per IP leaves room for a hall of students signing
        // in through one campus NAT address at the start of a lecture.
        'requests_per_ip' => (int) env('LOGIN_THROTTLE_REQUESTS_PER_IP', 120),
    ],

];
