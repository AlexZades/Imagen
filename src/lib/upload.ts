import sharp from 'sharp';
import { generateId } from './auth';
import { getStorageProvider, getStorageProviderType } from './storage';

export interface ProcessedImage {
  filename: string;
  thumbnailFilename: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Get the MIME type from a filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Process an uploaded image: save it, generate thumbnail, and return metadata
 */
export async function processUploadedImage(
  buffer: Buffer,
  originalFilename: string
): Promise<ProcessedImage> {
  const storage = getStorageProvider();
  
  // Generate unique filename
  const ext = originalFilename.split('.').pop() || 'png';
  const filename = `${generateId()}.${ext}`;
  const thumbnailFilename = `thumb_${filename}`;
  const mimeType = getMimeType(filename);

  // Get image metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Process the original image to buffer
  const processedImageBuffer = await image.toBuffer();

  // Generate thumbnail (max 400px width, maintain aspect ratio)
  const thumbnailBuffer = await sharp(buffer)
    .resize(400, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toBuffer();

  // Upload both files using the storage provider
  const [imageResult, thumbnailResult] = await Promise.all([
    storage.uploadFile(processedImageBuffer, filename, mimeType),
    storage.uploadFile(thumbnailBuffer, `thumbnails/${thumbnailFilename}`, mimeType),
  ]);

  return {
    filename,
    thumbnailFilename,
    imageUrl: imageResult.url,
    thumbnailUrl: thumbnailResult.url,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: buffer.length,
  };
}

/**
 * Delete an image and its thumbnail
 */
export async function deleteImage(filename: string, thumbnailFilename: string): Promise<void> {
  const storage = getStorageProvider();

  try {
    await Promise.all([
      storage.deleteFile(filename),
      storage.deleteFile(`thumbnails/${thumbnailFilename}`),
    ]);
  } catch (error) {
    console.error('Error deleting image files:', error);
  }
}

/**
 * Check if an image exists in storage
 */
export async function imageExists(filename: string): Promise<boolean> {
  const storage = getStorageProvider();
  return storage.fileExists(filename);
}

/**
 * Get an image from storage
 */
export async function getImageBuffer(filename: string): Promise<Buffer | null> {
  const storage = getStorageProvider();
  return storage.getFile(filename);
}

/**
 * Check if using S3 storage
 */
export function isUsingS3Storage(): boolean {
  return getStorageProviderType() === 's3';
}
