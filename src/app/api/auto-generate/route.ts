import { NextRequest, NextResponse } from 'next/server';
import { generateImagesForAllUsers, DEFAULT_CONFIG, type GenerationConfig } from '@/lib/auto-generation';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Authentication: Check for secret token
    const authHeader = request.headers.get('authorization');
    const secretToken = process.env.AUTO_GENERATION_SECRET;

    if (!secretToken) {
      return NextResponse.json(
        { message: 'Auto-generation not configured (missing AUTO_GENERATION_SECRET)' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json(
        { message: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Load config from database or use default
    let config: GenerationConfig = DEFAULT_CONFIG;
    
    try {
      const savedConfig = await prisma.generationConfig.findUnique({
        where: { key: 'algorithm_settings' }
      });
      
      if (savedConfig && savedConfig.value) {
        config = JSON.parse(savedConfig.value);
        console.log('Loaded config from database:', config);
      } else {
        console.log('No saved config found, using defaults');
      }
    } catch (error) {
      console.error('Error loading config from database, using defaults:', error);
    }

    // Parse optional config override from request body
    const body = await request.json().catch(() => ({}));
    if (body.config) {
      config = { ...config, ...body.config };
      console.log('Config overridden from request body');
    }

    console.log('Starting scheduled auto-generation with config:', config);

    // Run the generation process
    const report = await generateImagesForAllUsers(config);

    console.log('Auto-generation completed:', {
      totalUsers: report.totalUsers,
      successCount: report.successCount,
      failureCount: report.failureCount,
      durationMs: report.durationMs,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Auto-generation error:', error);
    return NextResponse.json(
      { message: 'Auto-generation failed', error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for checking status (no auth required)
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Auto-generation endpoint is active. Use POST with Bearer token to trigger generation.',
  });
}