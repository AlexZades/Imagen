import fs from 'fs';
import path from 'path';
import { StorageProvider, UploadResult } from './types';

/**
 * Local Filesystem Storage Provider
 * 
 * Stores files in the local filesystem under public/uploads.
 * This is the default storage provider for development and simple deployments.
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;
  private publicPath: string;

  constructor(uploadDir?: string, publicPath?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'public', 'uploads');
    this.publicPath = publicPath || '/uploads';
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    const thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    this.ensureDirectories();
    
    const filePath = path.join(this.uploadDir, key);
    
    // Ensure the directory for the key exists (for nested keys like thumbnails/thumb_xxx.png)
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    await fs.promises.writeFile(filePath, buffer);
    
    const url = `${this.publicPath}/${key}`;
    
    return {
      url,
      key,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(`Error deleting file ${key}:`, error);
      // Don't throw - file might already be deleted
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key);
    return fs.existsSync(filePath);
  }

  async getFile(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.uploadDir, key);
    
    try {
      if (fs.existsSync(filePath)) {
        return await fs.promises.readFile(filePath);
      }
      return null;
    } catch (error) {
      console.error(`Error reading file ${key}:`, error);
      return null;
    }
  }

  getProviderType(): 'local' | 's3' {
    return 'local';
  }

  /**
   * Get the full filesystem path for a key
   * Useful for operations that need direct file access (like sharp)
   */
  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }
}
