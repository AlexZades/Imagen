import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessKeysEnabled = process.env.ENABLE_ACCESS_KEYS === 'true' || process.env.USE_ACCESS_KEYS === 'true';
    
    if (!accessKeysEnabled) {
       return NextResponse.json({ accessKeyRequired: false });
    }

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    
    // Not required for first user even if enabled
    return NextResponse.json({ accessKeyRequired: !isFirstUser });
  } catch (error) {
    console.error('Error checking auth requirements:', error);
    return NextResponse.json({ accessKeyRequired: false }, { status: 500 });
  }
}