/**
 * Sync Database Schema
 * 
 * This script checks the database schema and reports any issues.
 * Run this if you get "column does not exist" errors.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncDatabase() {
  console.log('🔄 Checking database schema...\n');

  try {
    // Check all tables exist
    const tables = ['User', 'Image', 'Tag', 'Style', 'Like', 'ImageTag', 'ImageStyle', 'GenerationConfig'];
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_name = ${table}
        `;
        console.log(`✅ Table ${table} exists`);
      } catch (error: any) {
        console.log(`❌ Table ${table} missing or error: ${error.message}`);
      }
    }

    console.log('\n🎉 Database check complete!');
    console.log('\nIf you see missing tables, run:');
    console.log('  npx prisma migrate deploy');

  } catch (error: any) {
    console.error('❌ Error checking database:', error.message);
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