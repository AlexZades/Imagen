import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId, imageId, isLike } = await request.json();

    if (!userId || !imageId || typeof isLike !== 'boolean') {
      return NextResponse.json(
        { message: 'userId, imageId, and isLike are required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if user already liked/disliked this image
      const existingLike = await tx.like.findUnique({
        where: {
          userId_imageId: {
            userId,
            imageId
          }
        }
      });

      const image = await tx.image.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new Error('Image not found');
      }

      if (existingLike) {
        // If clicking the same button, remove the like/dislike
        if (existingLike.isLike === isLike) {
          await tx.like.delete({
            where: {
              userId_imageId: {
                userId,
                imageId
              }
            }
          });

          // Decrement the appropriate count
          await tx.image.update({
            where: { id: imageId },
            data: isLike
              ? { likeCount: { decrement: 1 } }
              : { dislikeCount: { decrement: 1 } }
          });
        } else {
          // Switch from like to dislike or vice versa
          await tx.like.update({
            where: {
              userId_imageId: {
                userId,
                imageId
              }
            },
            data: { isLike }
          });

          // Update counts
          await tx.image.update({
            where: { id: imageId },
            data: existingLike.isLike
              ? { likeCount: { decrement: 1 }, dislikeCount: { increment: 1 } }
              : { dislikeCount: { decrement: 1 }, likeCount: { increment: 1 } }
          });
        }
      } else {
        // Create new like/dislike
        await tx.like.create({
          data: {
            userId,
            imageId,
            isLike,
          }
        });

        // Increment the appropriate count
        await tx.image.update({
          where: { id: imageId },
          data: isLike
            ? { likeCount: { increment: 1 } }
            : { dislikeCount: { increment: 1 } }
        });
      }

      // Get updated image
      const updatedImage = await tx.image.findUnique({
        where: { id: imageId }
      });

      return updatedImage;
    });

    return NextResponse.json({
      likeCount: result?.likeCount || 0,
      dislikeCount: result?.dislikeCount || 0,
    });
  } catch (error: any) {
    console.error('Error processing like:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const imageId = searchParams.get('imageId');

    if (!userId || !imageId) {
      return NextResponse.json(
        { message: 'userId and imageId are required' },
        { status: 400 }
      );
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId
        }
      }
    });

    return NextResponse.json({
      hasLiked: like ? like.isLike : null,
    });
  } catch (error: any) {
    console.error('Error fetching like status:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}