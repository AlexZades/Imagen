import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { generateId } from '@/lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { message: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to storage
    const storage = getStorageProvider();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `avatars/${userId}_${generateId()}.${ext}`;
    
    // Check if user has an existing avatar and delete it?
    // Usually good practice, but for S3 we might skip or do it async.
    // If we use overwrite (same key), that works too.
    // But using unique key avoids caching issues.
    // Let's just upload new one. Cleaning up old ones is an exercise for later/background job.

    const uploadResult = await storage.uploadFile(buffer, filename, file.type);

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: uploadResult.url,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
