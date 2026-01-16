/**
 * Sync Database Schema
 * 
 * This script adds missing columns to the database to match the Prisma schema.
 * Run this if you get "column does not exist" errors.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncDatabase() {
  console.log('🔄 Syncing database schema...\n');

  try {
    // Add updatedAt to User table
    console.log('Adding updatedAt to User table...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'User' AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
          UPDATE "User" SET "updatedAt" = "createdAt";
        END IF;
      END $$;
    `;
    console.log('✅ User table updated\n');

    // Add updatedAt to Tag table
    console.log('Adding updatedAt to Tag table...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Tag' AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "Tag" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
          UPDATE "Tag" SET "updatedAt" = "createdAt";
        END IF;
      END $$;
    `;
    console.log('✅ Tag table updated\n');

    // Add updatedAt to Style table
    console.log('Adding updatedAt to Style table...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Style' AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "Style" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
          UPDATE "Style" SET "updatedAt" = "createdAt";
        END IF;
      END $$;
    `;
    console.log('✅ Style table updated\n');

    // Add updatedAt to GenerationConfig table
    console.log('Adding updatedAt to GenerationConfig table...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'GenerationConfig' AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "GenerationConfig" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
          UPDATE "GenerationConfig" SET "updatedAt" = "createdAt";
        END IF;
      END $$;
    `;
    console.log('✅ GenerationConfig table updated\n');

    console.log('🎉 Database sync complete!');

  } catch (error: any) {
    console.error('❌ Error syncing database:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });