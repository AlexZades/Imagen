# Quick Start: Simple Tags Migration

## TL;DR

```bash
# 1. Backup (recommended)
pg_dump $DATABASE_URL > backup.sql

# 2. Run migration
chmod +x scripts/migrate-simple-tags.sh
./scripts/migrate-simple-tags.sh

# 3. Verify
chmod +x scripts/verify-simple-tags.sh
./scripts/verify-simple-tags.sh

# 4. Populate existing data (optional)
npm run populate:simple-tags

# 5. Restart
docker compose restart

# 6. Test
# Go to Admin Panel → Auto-Generation → Run test
# Go to Admin Panel → Simple Tags → View analytics
```

## What This Does

- ✅ Adds automatic simple tags tracking
- ✅ Uses PostgreSQL triggers (no app code needed)
- ✅ Does NOT delete any existing data
- ✅ Safe and reversible

## Expected Output

After migration, you should see:

```
✅ SimpleTag table exists
✅ ImageSimpleTag table exists
✅ Increment trigger exists
✅ Decrement trigger exists
```

## Testing

1. **Generate an image** with tags like "standing, smiling, outdoors"
2. **Check admin panel** → Simple Tags tab
3. **Verify counts** are incrementing automatically
4. **Delete an image** and verify counts decrement

## Troubleshooting

**Migration fails?**
- Check DATABASE_URL is set
- Ensure you have CREATE permission
- Review `MIGRATION_GUIDE.md`

**Triggers not working?**
- Run verification script
- Check PostgreSQL logs
- See troubleshooting in `MIGRATION_GUIDE.md`

## Need Help?

See detailed guides:
- `MIGRATION_GUIDE.md` - Full migration instructions
- `SIMPLE_TAGS_SUMMARY.md` - Technical overview

## That's It!

Your simple tags are now automatically tracked by the database. No application code changes needed! 🎉