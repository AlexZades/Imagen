import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCreditsConfig, isCreditsSystemEnabled } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const enabled = isCreditsSystemEnabled();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const config = await getCreditsConfig();

    if (!userId) {
      return NextResponse.json({ enabled: true, config });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsFree: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: true,
      config,
      isUnlimited: user.isAdmin,
      creditsFree: user.creditsFree,
    });
  } catch (error: any) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}