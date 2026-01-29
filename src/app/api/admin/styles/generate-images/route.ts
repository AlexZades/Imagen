import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callComfyUIAPI } from '@/lib/auto-generation';
import { processUploadedImage, deleteImage } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const { userId, prompt, aspectRatio } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ message: 'Prompt is required' }, { status: 400 });
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

    // Get all styles that have a checkpoint name
    const styles = await prisma.style.findMany({
      where: {
        checkpointName: {
          not: null
        }
      }
    });

    console.log(`Starting demo image generation for ${styles.length} styles...`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const style of styles) {
      try {
        console.log(`Generating demo image for style: ${style.name} (${style.checkpointName})`);
        
        // Generate image using ComfyUI
        // We pass empty arrays for LoRAs since this is just for style preview
        const base64Image = await callComfyUIAPI(
          prompt,
          style.checkpointName!,
          [], // No LoRAs
          [], // No weights
          aspectRatio || 1
        );

        // Process and upload the image
        const buffer = Buffer.from(base64Image, 'base64');
        const processedImage = await processUploadedImage(
          buffer, 
          `style_demo_${style.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
        );

        // Delete old images if they exist
        if (style.demoImageFilename && style.demoImageThumbnailFilename) {
          await deleteImage(style.demoImageFilename, style.demoImageThumbnailFilename);
        }

        // Update style with new image URLs
        await prisma.style.update({
          where: { id: style.id },
          data: {
            demoImageUrl: processedImage.imageUrl,
            demoImageThumbnailUrl: processedImage.thumbnailUrl,
            demoImageFilename: processedImage.filename,
            demoImageThumbnailFilename: processedImage.thumbnailFilename,
          }
        });

        results.push({
          styleId: style.id,
          styleName: style.name,
          success: true
        });
        successCount++;
        
      } catch (error: any) {
        console.error(`Failed to generate demo image for style ${style.name}:`, error);
        results.push({
          styleId: style.id,
          styleName: style.name,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total: styles.length,
      successCount,
      failCount,
      results
    });

  } catch (error: any) {
    console.error('Error generating style demo images:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
