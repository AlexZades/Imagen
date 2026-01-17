#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Run migrations
npx prisma migrate deploy

echo "✅ Migrations complete!"