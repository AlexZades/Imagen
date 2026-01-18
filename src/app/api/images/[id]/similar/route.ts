import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6');

    // Get the current image with its tags and simple tags
    const currentImage = await prisma.image.findUnique({
      where: { id },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!currentImage) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    // Extract tag IDs and simple tags
    const tagIds = currentImage.imageTags.map((it) => it.tag.id);
    const simpleTags = currentImage.promptTags
      ? currentImage.promptTags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
      : [];

    // Find similar images based on shared tags or simple tags
    const similarImages = await prisma.image.findMany({
      where: {
        AND: [
          { id: { not: id } }, // Exclude current image
          {
            OR: [
              // Match by regular tags
              tagIds.length > 0 ? {
                imageTags: {
                  some: {
                    tagId: { in: tagIds }
                  }
                }
              } : {},
              // Match by simple tags (partial match)
              simpleTags.length > 0 ? {
                OR: simpleTags.map(tag => ({
                  promptTags: {
                    contains: tag
                  }
                }))
              } : {}
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          }
        },
        imageTags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        likeCount: 'desc'
      },
      take: limit
    });

    // Calculate similarity score for each image
    const imagesWithScore = similarImages.map(img => {
      const imgTagIds = img.imageTags.map(it => it.tag.id);
      const imgSimpleTags = img.promptTags
        ? img.promptTags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : [];

      // Count shared tags
      const sharedTagCount = imgTagIds.filter(tagId => tagIds.includes(tagId)).length;
      
      // Count shared simple tags
      const sharedSimpleTagCount = imgSimpleTags.filter(tag => 
        simpleTags.some(st => st.toLowerCase() === tag.toLowerCase())
      ).length;

      return {
        ...img,
        similarityScore: sharedTagCount * 2 + sharedSimpleTagCount // Weight regular tags higher
      };
    });

    // Sort by similarity score
    imagesWithScore.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json({
      images: imagesWithScore.slice(0, limit)
    });
  } catch (error: any) {
    console.error('Error fetching similar images:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}