/**
 * Populate Simple Tags from Existing Images
 * 
 * This script will:
 * 1. Find all existing images with promptTags
 * 2. Parse the tags
 * 3. Create ImageSimpleTag records
 * 4. Let the triggers automatically update counts
 */

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';

async function populateSimpleTags() {
  console.log('🔄 Starting simple tags population...\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Get all images with promptTags
    const images = await prisma.image.findMany({
      where: {
        promptTags: {
          not: null,
        },
      },
      select: {
        id: true,
        promptTags: true,
      },
    });

    console.log(`📊 Found ${images.length} images with prompt tags\n`);

    if (images.length === 0) {
      console.log('✅ No images to process');
      return;
    }

    let totalTagsCreated = 0;
    let processedImages = 0;

    for (const image of images) {
      if (!image.promptTags) continue;

      // Parse tags
      const tags = image.promptTags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);

      if (tags.length === 0) continue;

      try {
        // Create ImageSimpleTag records
        // The trigger will automatically create/update SimpleTag records
        await prisma.imageSimpleTag.createMany({
          data: tags.map((tag) => ({
            imageId: image.id,
            simpleTag: tag,
          })),
          skipDuplicates: true,
        });

        totalTagsCreated += tags.length;
        processedImages++;

        if (processedImages % 10 === 0) {
          console.log(`  Processed ${processedImages}/${images.length} images...`);
        }
      } catch (error: any) {
        console.error(`  ⚠️  Error processing image ${image.id}:`, error.message);
      }
    }

    console.log(`\n✅ Population complete!`);
    console.log(`  - Processed: ${processedImages} images`);
    console.log(`  - Created: ${totalTagsCreated} tag relationships`);

    // Show top tags
    const topTags = await prisma.simpleTag.findMany({
      orderBy: {
        usageCount: 'desc',
      },
      take: 10,
    });

    console.log(`\n📊 Top 10 Simple Tags:`);
    topTags.forEach((tag, index) => {
      console.log(`  ${index + 1}. ${tag.tag} (${tag.usageCount} uses)`);
    });

    // Show statistics
    const stats = await prisma.simpleTag.aggregate({
      _count: true,
      _sum: {
        usageCount: true,
      },
      _avg: {
        usageCount: true,
      },
    });

    console.log(`\n📈 Statistics:`);
    console.log(`  - Total unique tags: ${stats._count}`);
    console.log(`  - Total tag uses: ${stats._sum.usageCount || 0}`);
    console.log(`  - Average uses per tag: ${(stats._avg.usageCount || 0).toFixed(2)}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateSimpleTags()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });