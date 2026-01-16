/**
 * Diagnostic script to check Simple Tags setup
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';

async function checkSimpleTags() {
  console.log('🔍 Checking Simple Tags Setup...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Check ImageSimpleTag table
    console.log('📊 Checking ImageSimpleTag table...');
    const imageSimpleTagCount = await prisma.imageSimpleTag.count();
    console.log(`  - Total records: ${imageSimpleTagCount}`);
    
    if (imageSimpleTagCount > 0) {
      const sampleImageSimpleTags = await prisma.imageSimpleTag.findMany({
        take: 5,
        include: {
          image: {
            select: {
              title: true,
            }
          }
        }
      });
      console.log('  - Sample records:');
      sampleImageSimpleTags.forEach(ist => {
        console.log(`    • Image: "${ist.image.title}" → Tag: "${ist.simpleTag}"`);
      });
    }
    console.log();

    // Check SimpleTag table
    console.log('📊 Checking SimpleTag table...');
    const simpleTagCount = await prisma.simpleTag.count();
    console.log(`  - Total unique tags: ${simpleTagCount}`);
    
    if (simpleTagCount > 0) {
      const topTags = await prisma.simpleTag.findMany({
        take: 10,
        orderBy: {
          usageCount: 'desc'
        }
      });
      console.log('  - Top 10 tags:');
      topTags.forEach((tag, idx) => {
        console.log(`    ${idx + 1}. "${tag.tag}" (used ${tag.usageCount} times)`);
      });
    }
    console.log();

    // Check recent images with promptTags
    console.log('📊 Checking recent images...');
    const recentImages = await prisma.image.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        promptTags: true,
        createdAt: true,
      }
    });
    
    console.log(`  - Found ${recentImages.length} recent images:`);
    recentImages.forEach(img => {
      console.log(`    • "${img.title}"`);
      console.log(`      ID: ${img.id}`);
      console.log(`      Prompt Tags: ${img.promptTags || '(none)'}`);
      console.log(`      Created: ${img.createdAt}`);
    });
    console.log();

    // Check if triggers exist
    console.log('🔧 Checking database triggers...');
    const triggers = await prisma.$queryRaw<any[]>`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'simple_tag%'
    `;
    
    if (triggers.length > 0) {
      console.log('  ✅ Triggers found:');
      triggers.forEach(t => {
        console.log(`    • ${t.trigger_name} (${t.event_manipulation} on ${t.event_object_table})`);
      });
    } else {
      console.log('  ⚠️  No triggers found! This is the problem.');
      console.log('  → Run: npx prisma migrate deploy');
    }
    console.log();

    // Summary
    console.log('📋 Summary:');
    console.log(`  - ImageSimpleTag records: ${imageSimpleTagCount}`);
    console.log(`  - SimpleTag records: ${simpleTagCount}`);
    console.log(`  - Recent images: ${recentImages.length}`);
    console.log(`  - Triggers: ${triggers.length}`);
    console.log();

    if (imageSimpleTagCount === 0 && recentImages.some(img => img.promptTags)) {
      console.log('⚠️  ISSUE DETECTED:');
      console.log('  Images have promptTags but no ImageSimpleTag records exist.');
      console.log('  This means tags are not being saved when images are created.');
      console.log();
      console.log('💡 SOLUTION:');
      console.log('  1. Check that the Test Generator is calling the correct API');
      console.log('  2. Check browser console for errors when saving');
      console.log('  3. Try generating a new image and check logs');
    }

    if (simpleTagCount === 0 && imageSimpleTagCount > 0) {
      console.log('⚠️  ISSUE DETECTED:');
      console.log('  ImageSimpleTag records exist but no SimpleTag records.');
      console.log('  This means the triggers are not working.');
      console.log();
      console.log('💡 SOLUTION:');
      console.log('  Run: npx prisma migrate deploy');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkSimpleTags()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });