import { NextRequest, NextResponse } from 'next/server';
import { getCreditsConfig, getUserCreditsFree, isCreditsSystemEnabled } from '@/lib/credits';

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

    const creditsFree = await getUserCreditsFree(userId);
    if (creditsFree === null) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: true,
      config,
      creditsFree,
    });
  } catch (error: any) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}