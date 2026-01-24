import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { getUserCreditsFree, grantDailyFreeCreditsIfNeeded } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Daily free credits grant (at most once per UTC day)
    await grantDailyFreeCreditsIfNeeded(user.id);
    const creditsFree = await getUserCreditsFree(user.id);

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        avatarUrl: true,
        isAdmin: true,
      },
    });

    return NextResponse.json({
      user: {
        ...refreshed,
        creditsFree: creditsFree ?? 0,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}