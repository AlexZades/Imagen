import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minUsage = parseInt(searchParams.get('minUsage') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');

    console.log('Simple tags API called with params:', {
      minUsage,
      limit,
      search,
    });

    // Get all images with promptTags
    const images = await prisma.image.findMany({
      where: {
        promptTags: {
          not: null,
        },
      },
      select: {
        promptTags: true,
      },
    });

    // Parse and count all tags
    const tagCounts = new Map<string, number>();
    
    images.forEach((image) => {
      if (!image.promptTags) return;
      
      const tags = image.promptTags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
      
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Convert to array and filter
    let simpleTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .filter((item) => item.count >= minUsage);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      simpleTags = simpleTags.filter((item) =>
        item.tag.includes(searchLower)
      );
    }

    // Sort by count descending
    simpleTags.sort((a, b) => b.count - a.count);

    // Apply limit
    simpleTags = simpleTags.slice(0, limit);

    const totalImages = images.length;
    const totalUniqueTags = tagCounts.size;

    console.log('Simple tags query results:', {
      tagsFound: simpleTags.length,
      totalUniqueTags,
      totalImages,
    });

    return NextResponse.json({
      simpleTags: simpleTags.map((item) => ({
        tag: item.tag,
        count: item.count,
        category: null,
        createdAt: null,
        updatedAt: null,
      })),
      totalUniqueTags,
      totalImages,
    });
  } catch (error: any) {
    console.error('Error fetching simple tags:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}