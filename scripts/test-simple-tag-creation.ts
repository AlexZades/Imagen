/**
 * Test Simple Tag Creation
 * 
 * This script will manually test creating ImageSimpleTag records
 * to verify the triggers are working.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';

async function testSimpleTagCreation() {
  console.log('🧪 Testing Simple Tag Creation...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Find a test image (or create one)
    let testImage = await prisma.image.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!testImage) {
      console.log('📝 No images found, creating a test image...');
      testImage = await prisma.image.create({
        data: {
          userId: (await prisma.user.findFirst())!.id,
          title: 'Test Image for Simple Tags',
          promptTags: 'test-tag-1, test-tag-2, test-tag-3',
          imageUrl: '/test.png',
          thumbnailUrl: '/test-thumb.png',
          filename: 'test.png',
          thumbnailFilename: 'test-thumb.png',
          width: 512,
          height: 512,
          size: 1024,
        }
      });
      console.log(`✅ Created test image: ${testImage.id}\n`);
    } else {
      console.log(`✅ Using existing image: ${testImage.id} - "${testImage.title}"\n`);
    }

    // Test 1: Create ImageSimpleTag records
    console.log('📝 Test 1: Creating ImageSimpleTag records...');
    const testTags = ['test-standing', 'test-smiling', 'test-outdoors'];
    
    await prisma.imageSimpleTag.createMany({
      data: testTags.map(tag => ({
        imageId: testImage.id,
        simpleTag: tag,
      })),
      skipDuplicates: true,
    });
    console.log(`✅ Created ${testTags.length} ImageSimpleTag records\n`);

    // Test 2: Check if ImageSimpleTag records exist
    console.log('📝 Test 2: Checking ImageSimpleTag records...');
    const imageSimpleTags = await prisma.imageSimpleTag.findMany({
      where: { imageId: testImage.id }
    });
    console.log(`✅ Found ${imageSimpleTags.length} ImageSimpleTag records:`);
    imageSimpleTags.forEach(ist => {
      console.log(`  - ${ist.simpleTag}`);
    });
    console.log();

    // Test 3: Check if SimpleTag records were created by trigger
    console.log('📝 Test 3: Checking if triggers created SimpleTag records...');
    const simpleTags = await prisma.simpleTag.findMany({
      where: {
        tag: { in: testTags }
      }
    });
    
    if (simpleTags.length === 0) {
      console.log('❌ PROBLEM FOUND: No SimpleTag records created!');
      console.log('   This means the database triggers are NOT working.\n');
      console.log('💡 SOLUTION:');
      console.log('   Run: npx prisma migrate deploy');
      console.log('   This will create the triggers.\n');
    } else {
      console.log(`✅ Found ${simpleTags.length} SimpleTag records:`);
      simpleTags.forEach(st => {
        console.log(`  - "${st.tag}" (usageCount: ${st.usageCount})`);
      });
      console.log('\n✅ Triggers are working correctly!\n');
    }

    // Test 4: Check trigger functions exist
    console.log('📝 Test 4: Checking if trigger functions exist...');
    const functions = await prisma.$queryRaw<any[]>`
      SELECT proname 
      FROM pg_proc 
      WHERE proname LIKE '%simple_tag%'
    `;
    
    if (functions.length === 0) {
      console.log('❌ PROBLEM: No trigger functions found!');
      console.log('   Run: npx prisma migrate deploy\n');
    } else {
      console.log('✅ Found trigger functions:');
      functions.forEach(f => {
        console.log(`  - ${f.proname}`);
      });
      console.log();
    }

    // Test 5: Check triggers exist
    console.log('📝 Test 5: Checking if triggers exist...');
    const triggers = await prisma.$queryRaw<any[]>`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'simple_tag%'
    `;
    
    if (triggers.length === 0) {
      console.log('❌ PROBLEM: No triggers found!');
      console.log('   Run: npx prisma migrate deploy\n');
    } else {
      console.log('✅ Found triggers:');
      triggers.forEach(t => {
        console.log(`  - ${t.trigger_name} (${t.event_manipulation} on ${t.event_object_table})`);
      });
      console.log();
    }

    console.log('📋 Summary:');
    console.log(`  - ImageSimpleTag records: ${imageSimpleTags.length}`);
    console.log(`  - SimpleTag records: ${simpleTags.length}`);
    console.log(`  - Trigger functions: ${functions.length}`);
    console.log(`  - Triggers: ${triggers.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleTagCreation()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });