import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/upload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        },
        imageTags: {
          include: {
            tag: true
          }
        },
        imageStyles: {
          include: {
            style: true
          }
        }
      }
    });

    if (!image) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    // Increment view count
    await prisma.image.update({
      where: { id },
      data: {
        viewCount: { increment: 1 }
      }
    });

    // Extract tags and styles
    const tags = image.imageTags.map(it => it.tag);
    const styles = image.imageStyles.map(is => is.style);

    return NextResponse.json({
      image: {
        ...image,
        viewCount: image.viewCount + 1, // Return incremented count
      },
      tags,
      styles,
      user: image.user,
    });
  } catch (error: any) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, title, description, promptTags } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if image exists and user owns it
    const image = await prisma.image.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!image) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    if (image.userId !== userId) {
      return NextResponse.json(
        { message: 'Unauthorized: You can only edit your own images' },
        { status: 403 }
      );
    }

    // Update the image
    const updatedImage = await prisma.image.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(promptTags !== undefined && { promptTags }),
      }
    });

    return NextResponse.json({ image: updatedImage });
  } catch (error: any) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if image exists and user owns it
    const image = await prisma.image.findUnique({
      where: { id },
      select: {
        userId: true,
        filename: true,
        thumbnailFilename: true,
      }
    });

    if (!image) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    if (image.userId !== userId) {
      return NextResponse.json(
        { message: 'Unauthorized: You can only delete your own images' },
        { status: 403 }
      );
    }

    // Delete the image files from disk
    if (image.filename && image.thumbnailFilename) {
      await deleteImage(image.filename, image.thumbnailFilename);
    }

    // Delete the image record (cascade will handle imageTags and imageStyles)
    await prisma.image.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}