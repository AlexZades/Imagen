# Quick Fix: ImageSimpleTag Error

## Problem
The `imageSimpleTag` model is missing from the Prisma client, causing auto-generation to fail.

## Solution

Run these commands in order:

### 1. Generate Prisma Client
```bash
npx prisma generate
```

### 2. Apply Migration
```bash
npx prisma migrate deploy
```

### 3. Restart Application
```bash
# If using Docker
docker compose restart

# If running locally
npm run dev
```

## Verify Fix

After restarting, test the auto-generation:

1. Go to **Admin Panel** → **Auto-Generation** tab
2. Click "Test Generation for Current User"
3. Should now work without errors

## What This Does

- Adds `ImageSimpleTag` model to Prisma schema
- Creates the database table if it doesn't exist
- Sets up foreign key relationships
- Creates/updates PostgreSQL triggers for automatic counting
- Generates the Prisma client with the new model

## If Migration Fails

If you get errors about existing tables/triggers, that's OK - the migration is designed to be idempotent (safe to run multiple times).

Just make sure to run `npx prisma generate` to update the Prisma client.