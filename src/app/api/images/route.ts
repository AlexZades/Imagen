import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const tagId = searchParams.get('tagId');
    const styleId = searchParams.get('styleId');
    const simpleTag = searchParams.get('simpleTag');
    const sort = searchParams.get('sort'); // 'new' or 'random'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (tagId) {
      where.imageTags = {
        some: {
          tagId
        }
      };
    }

    if (styleId) {
      where.imageStyles = {
        some: {
          styleId
        }
      };
    }

    if (simpleTag) {
      // Search for images where promptTags contains the simple tag
      where.promptTags = {
        contains: simpleTag,
        mode: 'insensitive' as const
      };
    }

    let orderBy: any = { createdAt: 'desc' };

    if (sort === 'new') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'random') {
      // For random sorting, we'll fetch more than needed and shuffle
      // This is a simple approach; for large datasets, consider using SQL random functions
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: sort === 'random' ? undefined : orderBy,
        skip: offset,
        take: sort === 'random' ? limit * 3 : limit, // Fetch more for random
      }),
      prisma.image.count({ where })
    ]);

    // Shuffle and limit if random sort
    let finalImages = images;
    if (sort === 'random') {
      finalImages = images
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    }

    return NextResponse.json({
      images: finalImages,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      title,
      description,
      promptTags,
      imageUrl,
      thumbnailUrl,
      filename,
      thumbnailFilename,
      width,
      height,
      size,
      tagIds,
      styleIds,
    } = await request.json();

    if (!userId || !title || !imageUrl || !width || !height) {
      return NextResponse.json(
        { message: 'userId, title, imageUrl, width, and height are required' },
        { status: 400 }
      );
    }

    // Create image with tags and styles in a transaction
    const newImage = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const image = await tx.image.create({
        data: {
          userId,
          title,
          description,
          promptTags, // Store as comma-delimited string
          imageUrl,
          thumbnailUrl,
          filename,
          thumbnailFilename,
          width,
          height,
          size,
        }
      });

      // Add tags (LoRA tags)
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        await tx.imageTag.createMany({
          data: tagIds.map((tagId: string) => ({
            imageId: image.id,
            tagId,
          }))
        });

        // Update tag usage counts
        await tx.tag.updateMany({
          where: {
            id: { in: tagIds }
          },
          data: {
            usageCount: { increment: 1 }
          }
        });
      }

      // Add styles
      if (styleIds && Array.isArray(styleIds) && styleIds.length > 0) {
        await tx.imageStyle.createMany({
          data: styleIds.map((styleId: string) => ({
            imageId: image.id,
            styleId,
          }))
        });

        // Update style usage counts
        await tx.style.updateMany({
          where: {
            id: { in: styleIds }
          },
          data: {
            usageCount: { increment: 1 }
          }
        });
      }

      return image;
    });

    return NextResponse.json({ image: newImage }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating image:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}