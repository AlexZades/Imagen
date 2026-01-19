#!/bin/sh
set -e

echo "🚀 Starting PixelVault..."

# Run migrations if AUTO_MIGRATE is enabled
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "🔄 AUTO_MIGRATE enabled - running database migrations..."
    # Use the locally installed prisma from node_modules instead of npx
    ./node_modules/.bin/prisma migrate deploy
    echo "✅ Migrations complete!"
else
    echo "⏭️  AUTO_MIGRATE disabled - skipping migrations"
fi

# Execute the main command
exec "$@"