import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

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
    const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
    const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

    // Ensure thumbnail directory exists
    if (!fs.existsSync(THUMBNAIL_DIR)) {
      fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const image of images) {
      if (!image.filename) continue;

      const imagePath = path.join(UPLOAD_DIR, image.filename);
      
      // Determine thumbnail filename
      let thumbnailFilename = image.thumbnailFilename;
      if (!thumbnailFilename) {
        thumbnailFilename = `thumb_${image.filename}`;
      }
      
      const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);

      // Check if original image exists
      if (fs.existsSync(imagePath)) {
        try {
          // Check if thumbnail exists, if not or if we want to force regenerate (optional logic)
          // For now, let's regenerate all to be safe or maybe check existence
          // Let's just regenerate them all to ensure consistency
          
          await sharp(imagePath)
            .resize(400, null, {
              withoutEnlargement: true,
              fit: 'inside',
            })
            .toFile(thumbnailPath);

          // Update database if thumbnail filename was missing or changed (though we are keeping it consistent)
          if (image.thumbnailFilename !== thumbnailFilename || image.thumbnailUrl !== `/uploads/thumbnails/${thumbnailFilename}`) {
             await prisma.image.update({
                where: { id: image.id },
                data: {
                    thumbnailFilename: thumbnailFilename,
                    thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`
                }
             });
          }

          processedCount++;
        } catch (err) {
          console.error(`Failed to generate thumbnail for ${image.filename}:`, err);
          errorCount++;
        }
      } else {
        console.warn(`Original image not found: ${imagePath}`);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      message: 'Thumbnail regeneration complete', 
      processed: processedCount, 
      errors: errorCount 
    });

  } catch (error: any) {
    console.error('Error regenerating thumbnails:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}