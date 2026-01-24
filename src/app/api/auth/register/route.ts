import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { getUserCreditsFree, grantDailyFreeCreditsIfNeeded } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Check if this is the first user
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const created = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashPassword(password),
        isAdmin: isFirstUser,
      },
      select: {
        id: true,
      },
    });

    // Daily free credits grant (acts as initial credit allocation too)
    await grantDailyFreeCreditsIfNeeded(created.id);
    const creditsFree = await getUserCreditsFree(created.id);

    const newUser = await prisma.user.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        isAdmin: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ user: { ...newUser, creditsFree: creditsFree ?? 0 } }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}