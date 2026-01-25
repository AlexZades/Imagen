#!/bin/sh
set -e

echo "🚀 Starting PixelVault..."

# Run migrations if AUTO_MIGRATE is enabled
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "🔄 AUTO_MIGRATE enabled - running database migrations..."
    # Use the locally installed prisma from node_modules instead of npx
    
    echo "Running database migrations..."
    # Run migrations
    if ! ./node_modules/.bin/prisma migrate deploy; then
        echo "⚠️  Migration failed. This often happens when the database state is inconsistent with the new migration history."
        echo "🔄 Attempting to reset the database to apply the fresh schema..."
        
        # Run the reset script
        if node scripts/reset-db.js; then
            echo "✅ Database reset successful."
            echo "🔄 Retrying migration..."
            ./node_modules/.bin/prisma migrate deploy
        else
            echo "❌ Database reset failed. Please check the logs."
            exit 1
        fi
    fi
    echo "✅ Migrations complete!"
else
    echo "⏭️  AUTO_MIGRATE disabled - skipping migrations"
fi

# Execute the main command
exec "$@"