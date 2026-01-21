import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch likes with associated images
    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId,
          isLike: true, // Only fetch actual likes, not dislikes
        },
        include: {
          image: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.like.count({
        where: {
          userId,
          isLike: true,
        },
      }),
    ]);

    // Extract images from likes
    const images = likes.map(like => like.image);

    return NextResponse.json({
      images,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching liked images:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}