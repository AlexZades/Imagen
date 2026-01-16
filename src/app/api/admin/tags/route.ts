import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const { userId, tagId, name, loras, minStrength, maxStrength, forcedPromptTags } = await request.json();

    if (!userId || !tagId) {
      return NextResponse.json(
        { message: 'userId and tagId are required' },
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

    // Update the tag
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(name !== undefined && { name }),
        ...(loras !== undefined && { loras }),
        ...(minStrength !== undefined && { minStrength }),
        ...(maxStrength !== undefined && { maxStrength }),
        ...(forcedPromptTags !== undefined && { forcedPromptTags }),
      }
    });

    return NextResponse.json({ tag });
  } catch (error: any) {
    console.error('Error updating tag:', error);
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
    const tagId = searchParams.get('tagId');

    if (!userId || !tagId) {
      return NextResponse.json(
        { message: 'userId and tagId are required' },
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

    // Delete the tag (cascade will handle imageTags)
    await prisma.tag.delete({
      where: { id: tagId }
    });

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}