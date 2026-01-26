import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const
          }
        }
      : {};

    const styles = await prisma.style.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ styles });
  } catch (error: any) {
    console.error('Error fetching styles:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, checkpointName } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'Style name is required' }, { status: 400 });
    }

    // Check if style already exists
    const existingStyle = await prisma.style.findUnique({
      where: { name: name.toLowerCase() }
    });

    if (existingStyle) {
      return NextResponse.json({ style: existingStyle });
    }

    const newStyle = await prisma.style.create({
      data: {
        name,
        description,
        checkpointName,
      }
    });

    return NextResponse.json({ style: newStyle }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating style:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}