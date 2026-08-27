#!/bin/bash

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations and seed the demo/admin accounts.
# IMPORTANT: This assumes you have your database credentials configured in Render.
# The seeder uses updateOrCreate, so running it on every boot is safe.
php artisan migrate --seed --force

# Start Apache in foreground
exec apache2-foreground
