#!/bin/bash

# Simple Tags Migration Script
# This script will safely migrate your database to add simple tags tracking

set -e  # Exit on error

echo "=========================================="
echo "Simple Tags Migration Script"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it in your .env file or export it"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Show what will be created
echo "📋 This migration will:"
echo "  1. Create 'SimpleTag' table to track tag usage"
echo "  2. Create 'ImageSimpleTag' junction table"
echo "  3. Add PostgreSQL triggers for automatic counting"
echo "  4. NOT delete any existing data"
echo ""

# Ask for confirmation
read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Running Prisma migration..."
echo ""

# Generate Prisma client first
echo "Generating Prisma client..."
npx prisma generate

echo ""
echo "Deploying migration..."
# Run the migration using prisma migrate deploy
npx prisma migrate deploy

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📊 Next steps:"
echo "  1. Restart your application"
echo "  2. Test the auto-generation feature"
echo "  3. Check the Simple Tags viewer in the admin panel"
echo ""
echo "🔍 To verify the migration:"
echo "  - Run: ./scripts/verify-simple-tags.sh"
echo "  - Check that 'SimpleTag' and 'ImageSimpleTag' tables exist"
echo "  - Run a test generation to see tags being tracked"
echo ""