import { NextRequest, NextResponse } from 'next/server';
import { generateImagesForUser, DEFAULT_CONFIG, type GenerationConfig } from '@/lib/auto-generation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, config } = body;

    if (!userId) {
      return NextResponse.json(
        { message: 'userId is required' },
        { status: 400 }
      );
    }

    // Merge provided config with defaults
    const finalConfig: GenerationConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    console.log('Starting test generation for user:', userId);
    const startTime = new Date();

    // Run generation for the specific user
    const results = await generateImagesForUser(userId, finalConfig);

    const endTime = new Date();
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const report = {
      totalUsers: 1,
      totalImagesGenerated: results.length,
      successCount,
      failureCount,
      results,
      errors: results.filter((r) => !r.success).map((r) => r.error || 'Unknown error'),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
    };

    console.log('Test generation completed:', {
      successCount,
      failureCount,
      durationMs: report.durationMs,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Test generation error:', error);
    return NextResponse.json(
      { message: 'Test generation failed', error: error.message },
      { status: 500 }
    );
  }
}