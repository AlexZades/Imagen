import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { getStorageProvider, getStorageProviderType } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage/local-provider';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const images = await prisma.image.findMany();
    const storage = getStorageProvider();
    const providerType = getStorageProviderType();

    let processedCount = 0;
    let errorCount = 0;

    for (const image of images) {
      if (!image.filename) continue;

      // Determine thumbnail filename
      let thumbnailFilename = image.thumbnailFilename;
      if (!thumbnailFilename) {
        thumbnailFilename = `thumb_${image.filename}`;
      }

      try {
        let imageBuffer: Buffer | null = null;

        if (providerType === 'local') {
          // For local storage, we can read directly from the filesystem
          const localProvider = storage as LocalStorageProvider;
          const imagePath = localProvider.getFilePath(image.filename);
          
          if (fs.existsSync(imagePath)) {
            imageBuffer = await fs.promises.readFile(imagePath);
          }
        } else {
          // For S3 storage, download the original image
          imageBuffer = await storage.getFile(image.filename);
        }

        if (!imageBuffer) {
          console.warn(`Original image not found: ${image.filename}`);
          errorCount++;
          continue;
        }

        // Generate thumbnail
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(400, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .toBuffer();

        // Get mime type from filename
        const ext = image.filename.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp',
        };
        const mimeType = mimeTypes[ext || ''] || 'image/png';

        // Upload the thumbnail
        const thumbnailKey = `thumbnails/${thumbnailFilename}`;
        const result = await storage.uploadFile(thumbnailBuffer, thumbnailKey, mimeType);

        // Update database if thumbnail URL changed
        const newThumbnailUrl = result.url;
        if (image.thumbnailFilename !== thumbnailFilename || image.thumbnailUrl !== newThumbnailUrl) {
          await prisma.image.update({
            where: { id: image.id },
            data: {
              thumbnailFilename: thumbnailFilename,
              thumbnailUrl: newThumbnailUrl
            }
          });
        }

        processedCount++;
      } catch (err) {
        console.error(`Failed to generate thumbnail for ${image.filename}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      message: 'Thumbnail regeneration complete', 
      processed: processedCount, 
      errors: errorCount,
      storageProvider: providerType
    });

  } catch (error: any) {
    console.error('Error regenerating thumbnails:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
