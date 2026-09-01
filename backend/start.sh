#!/bin/bash

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations and seed the demo/admin accounts.
# IMPORTANT: This assumes you have your database credentials configured in Render.
# The seeder uses updateOrCreate, so running it on every boot is safe.
php artisan migrate --seed --force

# A queue worker, alongside Apache in the same container.
#
# Not an optimisation — a security requirement. Password-reset requests are
# answered by writing a job row and nothing else, precisely so that response
# time cannot reveal whether an index number belongs to a real student. With
# QUEUE_CONNECTION=sync that job would run inside the request instead and the
# enumeration oracle would come straight back, so the connection is set to
# database in render.yaml and this worker is what drains it.
#
# If reset emails stop arriving, check this process first. --tries=3 retries a
# transient mail failure; --max-time restarts the worker hourly so a leaked
# connection or a stale bootstrapped config cannot accumulate.
php artisan queue:work --tries=3 --sleep=1 --max-time=3600 &

# Start Apache in foreground
exec apache2-foreground
