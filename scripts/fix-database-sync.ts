import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseSync() {
  try {
    console.log('🔍 Diagnosing database schema issues...\n');

    // Check if Image table exists
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `;

    console.log('📊 Tables in database:');
    tables.forEach((t: any) => console.log(`  - ${t.tablename}`));

    // Check Image table columns
    const imageColumns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Image'
      ORDER BY ordinal_position;
    `;

    console.log('\n📋 Columns in Image table:');
    imageColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check migration status
    console.log('\n🔍 Checking migration status...');
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name 
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC 
      LIMIT 5;
    `;

    console.log('Recent migrations:');
    migrations.forEach((m: any) => console.log(`  - ${m.migration_name}`));

    console.log('\n💡 Solution:');
    console.log('Run these commands in order:');
    console.log('1. npx prisma migrate deploy');
    console.log('2. npx prisma generate');
    console.log('3. Restart your application');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If _prisma_migrations table does not exist:');
    console.log('Run: npx prisma migrate deploy');
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseSync();