#!/bin/bash

echo "🔄 Resetting and migrating database..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Deploy migrations
echo ""
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

# Check status
echo ""
echo "📊 Checking migration status..."
npx prisma migrate status

echo ""
echo "✅ Done! Now restart your application."