import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_FALLBACK_TAGS = [
  'standing', 'sitting', 'smiling', 'looking at viewer',
  'outdoors', 'indoors', 'day', 'night',
  'solo', 'portrait', 'full body', 'upper body',
  'detailed', 'high quality', 'masterpiece',
];

interface GenerationConfig {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (key) {
      // Get specific config
      const config = await prisma.generationConfig.findUnique({
        where: { key }
      });

      if (!config) {
        // Return default for fallback_tags
        if (key === 'fallback_tags') {
          return NextResponse.json({
            key: 'fallback_tags',
            value: DEFAULT_FALLBACK_TAGS.join(', '),
          });
        }
        return NextResponse.json({ message: 'Config not found' }, { status: 404 });
      }

      return NextResponse.json(config);
    } else {
      // Get all configs
      const configs = await prisma.generationConfig.findMany();
      
      // Ensure fallback_tags exists
      let fallbackTags = configs.find((c: GenerationConfig) => c.key === 'fallback_tags');
      if (!fallbackTags) {
        fallbackTags = {
          id: 'default',
          key: 'fallback_tags',
          value: DEFAULT_FALLBACK_TAGS.join(', '),
          createdAt: new Date(),
        };
      }

      return NextResponse.json({ configs: [...configs, fallbackTags] });
    }
  } catch (error: any) {
    console.error('Error fetching generation config:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, key, value } = await request.json();

    if (!userId || !key || !value) {
      return NextResponse.json(
        { message: 'userId, key, and value are required' },
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

    // Upsert the config
    const config = await prisma.generationConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error saving generation config:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}