import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getStorageProvider, getStorageProviderType } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const fileKey = pathSegments.join('/');
    
    const providerType = getStorageProviderType();
    
    // If using S3 storage, redirect to the S3 URL
    // This handles cases where old /uploads/... URLs are still in use
    if (providerType === 's3') {
      const storage = getStorageProvider();
      
      // Check if the file exists in S3
      const exists = await storage.fileExists(fileKey);
      
      if (!exists) {
        return new NextResponse('File not found', { status: 404 });
      }
      
      // Get the file from S3 and serve it
      const fileBuffer = await storage.getFile(fileKey);
      
      if (!fileBuffer) {
        return new NextResponse('File not found', { status: 404 });
      }
      
      // Determine content type based on file extension
      const ext = path.extname(fileKey).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      
      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      
      return new NextResponse(fileBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    // Local storage: serve from filesystem
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving upload:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
