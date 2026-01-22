import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LocalStorageProvider } from '@/lib/storage/local-provider';
import { S3StorageProvider } from '@/lib/storage/s3-provider';
import { getStorageProvider, getStorageProviderType } from '@/lib/storage';
import path from 'path';

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

    // Determine target storage (must be S3)
    const activeProviderType = getStorageProviderType();
    
    if (activeProviderType !== 's3') {
      return NextResponse.json(
        { message: 'Active storage provider must be S3 to migrate from local storage. Please configure S3 variables and set STORAGE_PROVIDER=s3.' },
        { status: 400 }
      );
    }

    const targetStorage = getStorageProvider() as S3StorageProvider;
    const sourceStorage = new LocalStorageProvider();

    // Get all images
    const images = await prisma.image.findMany();
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const image of images) {
      if (!image.filename) continue;

      try {
        // Check if already on S3
        const existsOnTarget = await targetStorage.fileExists(image.filename);
        if (existsOnTarget) {
          skippedCount++;
          continue;
        }

        // Check if exists locally
        const existsLocally = await sourceStorage.fileExists(image.filename);
        if (!existsLocally) {
          errors.push(`Image ${image.filename} not found locally`);
          errorCount++;
          continue;
        }

        // Migrate Main Image
        const imageBuffer = await sourceStorage.getFile(image.filename);
        if (imageBuffer) {
          const ext = path.extname(image.filename).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';
          
          const result = await targetStorage.uploadFile(imageBuffer, image.filename, mimeType);
          
          // Update URL in database
          await prisma.image.update({
            where: { id: image.id },
            data: { imageUrl: result.url }
          });
        }

        // Migrate Thumbnail
        if (image.thumbnailFilename) {
          const thumbKey = `thumbnails/${image.thumbnailFilename}`;
          // Check if thumbnail exists locally
          const thumbBuffer = await sourceStorage.getFile(thumbKey);
          
          if (thumbBuffer) {
             const ext = path.extname(image.thumbnailFilename).toLowerCase();
             const mimeTypes: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
             };
             const mimeType = mimeTypes[ext] || 'application/octet-stream';
             
             const result = await targetStorage.uploadFile(thumbBuffer, thumbKey, mimeType);
             
             await prisma.image.update({
                where: { id: image.id },
                data: { thumbnailUrl: result.url }
             });
          }
        }

        processedCount++;
      } catch (err: any) {
        console.error(`Failed to migrate image ${image.id}:`, err);
        errors.push(`Image ${image.id}: ${err.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      message: 'Migration complete', 
      processed: processedCount, 
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors
    });

  } catch (error: any) {
    console.error('Error migrating storage:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
