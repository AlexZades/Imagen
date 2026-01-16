# Developer Quick Reference

## Simple Tags System

### How to Use Simple Tags in Your Code

#### When Creating an Image

```typescript
// 1. Parse simple tags from comma-delimited string
const simpleTags = promptTags
  .split(',')
  .map(t => t.trim().toLowerCase())
  .filter(t => t.length > 0);

// 2. Create image with transaction
const image = await prisma.$transaction(async (tx) => {
  // Create the image
  const img = await tx.image.create({
    data: {
      userId,
      title,
      promptTags, // Store original comma-delimited string
      // ... other fields
    },
  });

  // Create simple tag relationships
  // TRIGGER WILL AUTO-INCREMENT COUNTS
  if (simpleTags.length > 0) {
    await tx.imageSimpleTag.createMany({
      data: simpleTags.map(tag => ({
        imageId: img.id,
        simpleTag: tag,
      })),
      skipDuplicates: true,
    });
  }

  return img;
});
```

#### When Deleting an Image

```typescript
// Just delete the image
// Cascade will delete ImageSimpleTag records
// Trigger will auto-decrement counts
await prisma.image.delete({
  where: { id: imageId }
});
```

#### Querying Simple Tags

```typescript
// Get all tags sorted by usage
const topTags = await prisma.simpleTag.findMany({
  orderBy: { usageCount: 'desc' },
  take: 20,
});

// Search tags
const tags = await prisma.simpleTag.findMany({
  where: {
    tag: {
      contains: searchQuery,
      mode: 'insensitive',
    },
  },
});

// Get tags for an image
const imageTags = await prisma.imageSimpleTag.findMany({
  where: { imageId },
  select: { simpleTag: true },
});
```

#### Finding Images by Simple Tag

```typescript
// Find images with a specific simple tag
const images = await prisma.image.findMany({
  where: {
    imageSimpleTags: {
      some: {
        simpleTag: tagName.toLowerCase(),
      },
    },
  },
});
```

## Database Triggers

### What They Do

**increment_simple_tag_usage()**
- Fires: AFTER INSERT on ImageSimpleTag
- Creates SimpleTag if doesn't exist
- Increments usageCount
- Updates updatedAt

**decrement_simple_tag_usage()**
- Fires: AFTER DELETE on ImageSimpleTag
- Decrements usageCount (min 0)
- Updates updatedAt

### Important Notes

✅ **DO**: Just insert/delete ImageSimpleTag records
❌ **DON'T**: Manually update SimpleTag.usageCount
✅ **DO**: Use lowercase for simpleTag values
❌ **DON'T**: Worry about creating SimpleTag records
✅ **DO**: Use transactions for data consistency
❌ **DON'T**: Try to bypass the triggers

## Common Patterns

### Pattern 1: Upload with Tags

```typescript
const simpleTags = userInput.split(',').map(t => t.trim().toLowerCase());

await prisma.$transaction(async (tx) => {
  const image = await tx.image.create({ data: imageData });
  
  await tx.imageSimpleTag.createMany({
    data: simpleTags.map(tag => ({
      imageId: image.id,
      simpleTag: tag,
    })),
  });
});
```

### Pattern 2: Update Image Tags

```typescript
await prisma.$transaction(async (tx) => {
  // Delete old tags (trigger decrements counts)
  await tx.imageSimpleTag.deleteMany({
    where: { imageId },
  });
  
  // Add new tags (trigger increments counts)
  await tx.imageSimpleTag.createMany({
    data: newTags.map(tag => ({
      imageId,
      simpleTag: tag.toLowerCase(),
    })),
  });
});
```

### Pattern 3: Get Tag Statistics

```typescript
const stats = await prisma.simpleTag.aggregate({
  _count: true,
  _sum: { usageCount: true },
  _avg: { usageCount: true },
  _max: { usageCount: true },
});
```

## API Endpoints

### GET /api/simple-tags

Query parameters:
- `category` - Filter by category
- `minUsage` - Minimum usage count
- `limit` - Max results (default 100)
- `search` - Search query

Response:
```json
{
  "simpleTags": [
    {
      "tag": "standing",
      "count": 42,
      "category": "pose",
      "createdAt": "2026-01-16T...",
      "updatedAt": "2026-01-16T..."
    }
  ],
  "totalUniqueTags": 150,
  "totalImages": 500
}
```

## Debugging

### Check if Triggers Exist

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'simple_tag%';
```

### Verify Counts Are Correct

```sql
SELECT 
  st.tag,
  st."usageCount" as stored_count,
  COUNT(ist.id) as actual_count,
  st."usageCount" - COUNT(ist.id) as difference
FROM "SimpleTag" st
LEFT JOIN "ImageSimpleTag" ist ON ist."simpleTag" = st.tag
GROUP BY st.tag, st."usageCount"
HAVING st."usageCount" != COUNT(ist.id);
```

### Recalculate All Counts

```sql
UPDATE "SimpleTag" st
SET "usageCount" = (
  SELECT COUNT(*)
  FROM "ImageSimpleTag" ist
  WHERE ist."simpleTag" = st.tag
);
```

## Performance Tips

1. **Use Indexes**: Already created on simpleTag and imageId
2. **Batch Operations**: Use createMany for multiple tags
3. **Transactions**: Always use for consistency
4. **Lowercase**: Always normalize to lowercase
5. **Pagination**: Use limit/offset for large result sets

## Testing

### Unit Test Example

```typescript
describe('Simple Tags', () => {
  it('should auto-increment count on insert', async () => {
    const image = await createTestImage();
    
    await prisma.imageSimpleTag.create({
      data: {
        imageId: image.id,
        simpleTag: 'test-tag',
      },
    });
    
    const tag = await prisma.simpleTag.findUnique({
      where: { tag: 'test-tag' },
    });
    
    expect(tag?.usageCount).toBe(1);
  });
  
  it('should auto-decrement count on delete', async () => {
    // ... test implementation
  });
});
```

## Troubleshooting

**Problem**: Counts are wrong
**Solution**: Run recalculation SQL above

**Problem**: Trigger not firing
**Solution**: Check trigger exists with SQL above

**Problem**: Duplicate tags
**Solution**: Always use lowercase normalization

**Problem**: Performance issues
**Solution**: Check indexes, use pagination

## Quick Commands

```bash
# Verify migration
./scripts/verify-simple-tags.sh

# Populate from existing data
npm run populate:simple-tags

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"SimpleTag\";"

# View top tags
psql $DATABASE_URL -c "SELECT tag, \"usageCount\" FROM \"SimpleTag\" ORDER BY \"usageCount\" DESC LIMIT 10;"
```

---

**Remember**: The triggers handle all counting automatically. Your job is just to insert/delete ImageSimpleTag records!