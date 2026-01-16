# Pre-Migration Checklist

Before running the simple tags migration, complete this checklist:

## Environment

- [ ] DATABASE_URL is set and correct
  ```bash
  echo $DATABASE_URL
  ```

- [ ] Can connect to database
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] Have CREATE permission
  ```bash
  psql $DATABASE_URL -c "SELECT has_database_privilege(current_user, current_database(), 'CREATE');"
  ```

## Backup

- [ ] Database backup created
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Backup file exists and is not empty
  ```bash
  ls -lh backup_*.sql
  ```

## Application State

- [ ] Application is stopped (recommended)
  ```bash
  docker compose down
  ```

- [ ] No active connections to database (optional)
  ```bash
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
  ```

## Files Ready

- [ ] Migration file exists
  ```bash
  ls -l prisma/migrations/20260116130000_add_simple_tags_with_triggers/migration.sql
  ```

- [ ] Scripts are executable
  ```bash
  chmod +x scripts/*.sh
  ```

- [ ] Prisma schema updated
  ```bash
  grep "SimpleTag" prisma/schema.prisma
  ```

## Understanding

- [ ] Read `MIGRATION_GUIDE.md`
- [ ] Understand what will be created
- [ ] Know how to rollback if needed
- [ ] Understand triggers will handle counting

## Ready to Proceed?

If all items are checked, you're ready to run:

```bash
./scripts/migrate-simple-tags.sh
```

## After Migration

- [ ] Run verification script
- [ ] Check admin panel
- [ ] Test auto-generation
- [ ] Verify counts are working
- [ ] Restart application

## Emergency Rollback

If something goes wrong:

```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

Or use the rollback SQL in `SIMPLE_TAGS_SUMMARY.md`.