import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

async function ensureDirectories() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }
}

async function regenerateThumbnail(imagePath: string, thumbnailPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log(`  ❌ Original image not found: ${imagePath}`);
      return false;
    }

    // Generate thumbnail (max 400px width, maintain aspect ratio)
    await sharp(imagePath)
      .resize(400, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toFile(thumbnailPath);

    console.log(`  ✅ Regenerated thumbnail: ${path.basename(thumbnailPath)}`);
    return true;
  } catch (error: any) {
    console.log(`  ❌ Failed to regenerate thumbnail: ${error.message}`);
    return false;
  }
}

async function fixThumbnails() {
  console.log('🔍 Checking and fixing thumbnails...\n');

  await ensureDirectories();

  // Get all images from database
  const images = await prisma.image.findMany({
    select: {
      id: true,
      title: true,
      filename: true,
      thumbnailFilename: true,
      imageUrl: true,
      thumbnailUrl: true,
    },
  });

  console.log(`Found ${images.length} images in database\n`);

  let fixed = 0;
  let missing = 0;
  let errors = 0;

  for (const image of images) {
    console.log(`Checking: ${image.title}`);

    if (!image.filename || !image.thumbnailFilename) {
      console.log(`  ⚠️  Missing filename data in database`);
      missing++;
      continue;
    }

    const imagePath = path.join(UPLOAD_DIR, image.filename);
    const thumbnailPath = path.join(THUMBNAIL_DIR, image.thumbnailFilename);

    // Check if thumbnail exists
    if (!fs.existsSync(thumbnailPath)) {
      console.log(`  ⚠️  Thumbnail missing, attempting to regenerate...`);
      
      const success = await regenerateThumbnail(imagePath, thumbnailPath);
      if (success) {
        fixed++;
      } else {
        errors++;
      }
    } else {
      console.log(`  ✅ Thumbnail exists`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total images: ${images.length}`);
  console.log(`  Thumbnails regenerated: ${fixed}`);
  console.log(`  Missing original images: ${missing}`);
  console.log(`  Errors: ${errors}`);

  if (fixed > 0) {
    console.log('\n✅ Thumbnail regeneration complete!');
  }
}

fixThumbnails()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });