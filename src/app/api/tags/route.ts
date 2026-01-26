import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const includeNsfw = searchParams.get('nsfw') === 'true';

    const where: any = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive' as const
      };
    }

    if (!includeNsfw) {
      where.nsfw = false;
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: {
        usageCount: 'desc'
      }
    });

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      loras, 
      minStrength, 
      maxStrength, 
      forcedPromptTags, 
      nsfw, 
      maleCharacterTags, 
      femaleCharacterTags, 
      otherCharacterTags,
      description,
      slider,
      sliderLowText,
      sliderHighText
    } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'Tag name is required' }, { status: 400 });
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.toLowerCase() }
    });

    if (existingTag) {
      return NextResponse.json({ tag: existingTag });
    }

    const newTag = await prisma.tag.create({
      data: {
        name,
        loras: loras || [],
        minStrength,
        maxStrength,
        forcedPromptTags,
        nsfw: nsfw || false,
        maleCharacterTags,
        femaleCharacterTags,
        otherCharacterTags,
        description,
        slider: slider || false,
        sliderLowText,
        sliderHighText,
      }
    });

    return NextResponse.json({ tag: newTag }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}