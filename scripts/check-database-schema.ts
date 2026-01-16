import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');

    // Try to query each table
    const tables = [
      { name: 'User', model: 'user' },
      { name: 'Image', model: 'image' },
      { name: 'Tag', model: 'tag' },
      { name: 'Style', model: 'style' },
      { name: 'Like', model: 'like' },
      { name: 'ImageTag', model: 'imageTag' },
      { name: 'ImageStyle', model: 'imageStyle' },
      { name: 'GenerationConfig', model: 'generationConfig' },
    ];

    for (const table of tables) {
      try {
        const count = await (prisma as any)[table.model].count();
        console.log(`✅ ${table.name}: ${count} records`);
      } catch (error: any) {
        console.log(`❌ ${table.name}: ${error.message}`);
      }
    }

    // Check for specific columns
    console.log('\n🔍 Checking Image table columns...');
    const imageColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Image'
      ORDER BY ordinal_position;
    `;
    console.log('Image columns:', imageColumns);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();