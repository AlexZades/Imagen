import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const { userId, styleId, name, description, checkpointName } = await request.json();

    if (!userId || !styleId) {
      return NextResponse.json(
        { message: 'userId and styleId are required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Update the style
    const style = await prisma.style.update({
      where: { id: styleId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(checkpointName !== undefined && { checkpointName }),
      }
    });

    return NextResponse.json({ style });
  } catch (error: any) {
    console.error('Error updating style:', error);
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
    const styleId = searchParams.get('styleId');

    if (!userId || !styleId) {
      return NextResponse.json(
        { message: 'userId and styleId are required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Delete the style (cascade will handle imageStyles)
    await prisma.style.delete({
      where: { id: styleId }
    });

    return NextResponse.json({ message: 'Style deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting style:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}