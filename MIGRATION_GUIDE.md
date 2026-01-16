# Simple Tags Migration Guide

This guide will help you safely migrate your database to add automatic simple tags tracking using PostgreSQL triggers.

## What This Migration Does

### New Tables
1. **SimpleTag**: Stores unique simple tags with automatic usage counting
   - `id`: Unique identifier
   - `tag`: The tag text (unique, lowercase)
   - `category`: Optional category (e.g., "pose", "location", "quality")
   - `usageCount`: Automatically tracked usage count
   - `createdAt`: When the tag was first used
   - `updatedAt`: Last time the tag was used

2. **ImageSimpleTag**: Junction table linking images to simple tags
   - `id`: Unique identifier
   - `imageId`: Reference to Image
   - `simpleTag`: The tag text
   - `createdAt`: When this relationship was created

### Database Triggers
- **increment_simple_tag_usage**: Automatically increments count when a tag is used
- **decrement_simple_tag_usage**: Automatically decrements count when an image is deleted

## Safety Features

✅ **No Data Loss**: This migration only ADDS new tables and triggers
✅ **Non-Destructive**: Existing tables and data are NOT modified
✅ **Reversible**: Can be rolled back if needed
✅ **Automatic**: Triggers handle counting without application code

## Prerequisites

Before running the migration:

1. **Backup your database** (recommended):
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Ensure DATABASE_URL is set**:
   ```bash
   echo $DATABASE_URL
   ```

3. **Stop your application** (optional but recommended):
   ```bash
   docker compose down
   ```

## Migration Steps

### Step 1: Review the Migration

Check what will be created:
```bash
cat prisma/migrations/20260116130000_add_simple_tags_with_triggers/migration.sql
```

### Step 2: Run the Migration

**Option A: Using the migration script (recommended)**
```bash
chmod +x scripts/migrate-simple-tags.sh
./scripts/migrate-simple-tags.sh
```

**Option B: Manual migration**
```bash
npx prisma generate
npx prisma migrate deploy
```

### Step 3: Verify the Migration

```bash
chmod +x scripts/verify-simple-tags.sh
./scripts/verify-simple-tags.sh
```

You should see:
- ✅ SimpleTag table exists
- ✅ ImageSimpleTag table exists
- ✅ Increment trigger exists
- ✅ Decrement trigger exists

### Step 4: Restart Your Application

```bash
docker compose up -d
```

## Testing the Migration

### 1. Test Auto-Generation

1. Go to Admin Panel → Auto-Generation tab
2. Run a test generation
3. Check that simple tags are being tracked

### 2. Check Simple Tags Viewer

1. Go to Admin Panel → Simple Tags tab
2. You should see tags with usage counts
3. Verify counts increment when new images are generated

### 3. Test Tag Deletion

1. Delete an image with simple tags
2. Check that usage counts decrement automatically

## How It Works

### When an Image is Created

```typescript
// Application code just inserts into ImageSimpleTag
await prisma.imageSimpleTag.createMany({
  data: simpleTags.map((tag) => ({
    imageId: image.id,
    simpleTag: tag.toLowerCase(),
  })),
});

// PostgreSQL trigger automatically:
// 1. Creates SimpleTag if it doesn't exist
// 2. Increments usageCount
// 3. Updates updatedAt timestamp
```

### When an Image is Deleted

```typescript
// Cascade delete removes ImageSimpleTag records
await prisma.image.delete({ where: { id: imageId } });

// PostgreSQL trigger automatically:
// 1. Decrements usageCount for each tag
// 2. Updates updatedAt timestamp
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag";
DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag";

-- Drop functions
DROP FUNCTION IF EXISTS increment_simple_tag_usage();
DROP FUNCTION IF EXISTS decrement_simple_tag_usage();

-- Drop tables
DROP TABLE IF EXISTS "ImageSimpleTag";
DROP TABLE IF EXISTS "SimpleTag";
```

## Troubleshooting

### Migration Fails

**Error: "relation already exists"**
- The tables might already exist
- Check with: `\dt` in psql
- If tables exist but are empty, you can drop them and re-run

**Error: "permission denied"**
- Your database user needs CREATE permission
- Check with: `\du` in psql

### Triggers Not Working

**Check if triggers exist:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'simple_tag%';
```

**Check trigger functions:**
```sql
SELECT proname FROM pg_proc 
WHERE proname LIKE '%simple_tag%';
```

### Counts Are Wrong

**Recalculate all counts:**
```sql
UPDATE "SimpleTag" st
SET "usageCount" = (
  SELECT COUNT(*) 
  FROM "ImageSimpleTag" ist 
  WHERE ist."simpleTag" = st.tag
);
```

## Performance Considerations

- **Indexes**: The migration adds indexes on frequently queried columns
- **Trigger Overhead**: Minimal - triggers are very fast
- **Concurrent Operations**: Triggers are atomic and handle concurrency well

## Next Steps

After successful migration:

1. ✅ Test auto-generation with simple tags
2. ✅ Review simple tags analytics in admin panel
3. ✅ Consider adding categories to popular tags
4. ✅ Monitor usage counts for insights

## Support

If you encounter issues:

1. Check the verification script output
2. Review PostgreSQL logs
3. Check application logs for errors
4. Verify DATABASE_URL is correct

## Summary

This migration adds powerful automatic tracking for simple tags without requiring any changes to your application logic. The database handles all counting automatically through triggers, ensuring accuracy and consistency.

**Key Benefits:**
- 🚀 Automatic counting - no application code needed
- 📊 Real-time analytics on tag usage
- 🔒 Atomic operations - always accurate
- 🎯 Foundation for recommendation algorithms