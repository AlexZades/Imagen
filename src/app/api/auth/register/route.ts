import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { grantDailyFreeCreditsIfNeeded } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, accessKey } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Check for access key requirement
    const accessKeysEnabled = process.env.ENABLE_ACCESS_KEYS === 'true';
    if (accessKeysEnabled) {
      if (!accessKey) {
        return NextResponse.json(
          { message: 'Access key is required' },
          { status: 400 }
        );
      }

      const keyRecord = await prisma.accessKey.findUnique({
        where: { key: accessKey },
      });

      if (!keyRecord) {
        return NextResponse.json(
          { message: 'Invalid access key' },
          { status: 400 }
        );
      }

      if (keyRecord.redeemed) {
        return NextResponse.json(
          { message: 'Access key has already been redeemed' },
          { status: 400 }
        );
      }
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

    // Use a transaction to ensure user creation and key redemption happen together
    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
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

      if (accessKeysEnabled && accessKey) {
        await tx.accessKey.update({
          where: { key: accessKey },
          data: {
            redeemed: true,
            redeemedAt: new Date(),
            userId: newUser.id,
          },
        });
      }

      return newUser;
    });

    // Daily free credits grant (acts as initial credit allocation too)
    await grantDailyFreeCreditsIfNeeded(created.id);

    const newUser = await prisma.user.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        isAdmin: true,
        avatarUrl: true,
        creditsFree: true,
      },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}