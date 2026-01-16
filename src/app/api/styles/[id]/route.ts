import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const style = await prisma.style.findUnique({
      where: { id }
    });

    if (!style) {
      return NextResponse.json({ message: 'Style not found' }, { status: 404 });
    }

    return NextResponse.json({ style });
  } catch (error: any) {
    console.error('Error fetching style:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}