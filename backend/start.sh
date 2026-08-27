#!/bin/bash

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations
# IMPORTANT: This assumes you have your database credentials configured in Render
php artisan migrate --force

# Start Apache in foreground
exec apache2-foreground
