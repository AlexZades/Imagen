import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { generateId } from './auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure upload directories exist
export function ensureUploadDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }
}

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
 * Process an uploaded image: save it, generate thumbnail, and return metadata
 */
export async function processUploadedImage(
  buffer: Buffer,
  originalFilename: string
): Promise<ProcessedImage> {
  ensureUploadDirs();

  // Generate unique filename
  const ext = path.extname(originalFilename);
  const filename = `${generateId()}${ext}`;
  const thumbnailFilename = `thumb_${filename}`;

  const imagePath = path.join(UPLOAD_DIR, filename);
  const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);

  // Get image metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Save original image
  await image.toFile(imagePath);

  // Generate thumbnail (max 400px width, maintain aspect ratio)
  await sharp(buffer)
    .resize(400, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toFile(thumbnailPath);

  return {
    filename,
    thumbnailFilename,
    imageUrl: `/uploads/${filename}`,
    thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: buffer.length,
  };
}

/**
 * Delete an image and its thumbnail
 */
export async function deleteImage(filename: string, thumbnailFilename: string): Promise<void> {
  const imagePath = path.join(UPLOAD_DIR, filename);
  const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);

  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
  } catch (error) {
    console.error('Error deleting image files:', error);
  }
}