import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '6');

    if (!userId) {
      // If no user, return popular images
      const images = await prisma.image.findMany({
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' }
        ],
        take: limit,
      });

      return NextResponse.json({ images });
    }

    // Get tags from images the user has liked
    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        isLike: true,
      },
      include: {
        image: {
          include: {
            imageTags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    });

    // Extract unique tag IDs from liked images
    const likedTagIds = new Set<string>();
    userLikes.forEach(like => {
      like.image.imageTags.forEach(imageTag => {
        likedTagIds.add(imageTag.tagId);
      });
    });

    if (likedTagIds.size === 0) {
      // If user hasn't liked any images with tags, return popular images
      const images = await prisma.image.findMany({
        where: {
          userId: { not: userId } // Don't recommend user's own images
        },
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' }
        ],
        take: limit,
      });

      return NextResponse.json({ images });
    }

    // Find images with matching tags that the user hasn't uploaded
    const recommendedImages = await prisma.image.findMany({
      where: {
        userId: { not: userId },
        imageTags: {
          some: {
            tagId: { in: Array.from(likedTagIds) }
          }
        }
      },
      orderBy: [
        { likeCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2, // Fetch more to ensure variety
    });

    // Shuffle and limit
    const shuffled = recommendedImages
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    // If we don't have enough recommendations, fill with popular images
    if (shuffled.length < limit) {
      const additionalImages = await prisma.image.findMany({
        where: {
          userId: { not: userId },
          id: { notIn: shuffled.map(img => img.id) }
        },
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' }
        ],
        take: limit - shuffled.length,
      });

      shuffled.push(...additionalImages);
    }

    return NextResponse.json({ images: shuffled });
  } catch (error: any) {
    console.error('Error fetching recommended images:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}