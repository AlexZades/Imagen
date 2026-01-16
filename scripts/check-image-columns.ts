import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageColumns() {
  try {
    console.log('🔍 Checking Image table columns...\n');

    const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Image'
      ORDER BY ordinal_position;
    `;

    console.log('Columns in Image table:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n🔍 Expected columns from Prisma schema:');
    const expectedColumns = [
      'id', 'userId', 'title', 'description', 'promptTags',
      'imageUrl', 'thumbnailUrl', 'filename', 'thumbnailFilename',
      'width', 'height', 'size', 'createdAt', 'viewCount', 'likeCount', 'dislikeCount'
    ];
    
    expectedColumns.forEach(col => {
      const exists = columns.find((c: any) => c.column_name === col);
      if (exists) {
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - MISSING!`);
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageColumns();