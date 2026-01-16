#!/bin/bash

# Simple Tags Verification Script
# This script checks if the simple tags migration was successful

set -e

echo "=========================================="
echo "Simple Tags Verification"
echo "=========================================="
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

echo "🔍 Checking database structure..."
echo ""

# Use psql to check tables and triggers
psql "$DATABASE_URL" << 'EOF'
-- Check if SimpleTag table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'SimpleTag'
        ) 
        THEN '✅ SimpleTag table exists'
        ELSE '❌ SimpleTag table NOT found'
    END as simple_tag_check;

-- Check if ImageSimpleTag table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'ImageSimpleTag'
        ) 
        THEN '✅ ImageSimpleTag table exists'
        ELSE '❌ ImageSimpleTag table NOT found'
    END as image_simple_tag_check;

-- Check if triggers exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'simple_tag_usage_increment'
        ) 
        THEN '✅ Increment trigger exists'
        ELSE '❌ Increment trigger NOT found'
    END as increment_trigger_check;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'simple_tag_usage_decrement'
        ) 
        THEN '✅ Decrement trigger exists'
        ELSE '❌ Decrement trigger NOT found'
    END as decrement_trigger_check;

-- Show current simple tags count
SELECT 
    COUNT(*) as total_simple_tags,
    SUM("usageCount") as total_usage
FROM "SimpleTag";

-- Show sample of simple tags
SELECT 
    tag,
    "usageCount",
    category
FROM "SimpleTag"
ORDER BY "usageCount" DESC
LIMIT 10;
EOF

echo ""
echo "✅ Verification complete!"
echo ""