#!/bin/sh
set -e

echo "🚀 Starting PixelVault..."

# Run migrations if AUTO_MIGRATE is enabled
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "🔄 AUTO_MIGRATE enabled - running database migrations..."
    # Use the locally installed prisma from node_modules instead of npx
    # Try to resolve any failed migrations first
        ./node_modules/.bin/prisma migrate resolve --applied 20260116140000_add_image_simple_tag_relation || echo "No failed migration to resolve or resolution failed. Continuing..."
    
        echo "Running database migrations..."
        # Run migrations
        ./node_modules/.bin/prisma migrate deploy
    echo "✅ Migrations complete!"
else
    echo "⏭️  AUTO_MIGRATE disabled - skipping migrations"
fi

# Execute the main command
exec "$@"