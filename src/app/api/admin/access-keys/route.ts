import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const keys = await prisma.accessKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        redeemer: {
          select: {
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error fetching access keys:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, count = 1 } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const createdKeys = [];
    for (let i = 0; i < count; i++) {
      // Generate a random key (e.g., 32 char hex)
      const key = crypto.randomBytes(16).toString('hex');
      const accessKey = await prisma.accessKey.create({
        data: {
          key,
        },
      });
      createdKeys.push(accessKey);
    }

    return NextResponse.json({ keys: createdKeys });
  } catch (error: any) {
    console.error('Error creating access keys:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const keyId = searchParams.get('keyId');

    if (!userId || !keyId) {
      return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await prisma.accessKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ message: 'Key deleted' });
  } catch (error: any) {
    console.error('Error deleting access key:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
