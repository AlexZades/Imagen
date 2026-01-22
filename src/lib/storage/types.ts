/**
 * Storage Provider Interface
 * 
 * This interface defines the contract for storage providers.
 * Implementations can be local filesystem or S3-compatible storage (like SeaweedFS).
 */

export interface UploadResult {
  /** The public URL to access the file */
  url: string;
  /** The storage key/path used to identify the file */
  key: string;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param buffer - The file data as a Buffer
   * @param key - The storage key/filename
   * @param mimeType - The MIME type of the file
   * @returns The upload result containing the public URL and key
   */
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult>;

  /**
   * Delete a file from storage
   * @param key - The storage key/filename to delete
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param key - The storage key/filename to check
   * @returns True if the file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get a file from storage
   * @param key - The storage key/filename to retrieve
   * @returns The file data as a Buffer, or null if not found
   */
  getFile(key: string): Promise<Buffer | null>;

  /**
   * Get the provider type
   */
  getProviderType(): 'local' | 's3';
}

export type StorageProviderType = 'local' | 's3';

export interface StorageConfig {
  provider: StorageProviderType;
  
  // S3-specific configuration
  s3?: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl?: string; // Optional: if public URL differs from endpoint
    forcePathStyle?: boolean; // For S3-compatible services like SeaweedFS
  };
  
  // Local-specific configuration
  local?: {
    uploadDir: string;
    publicPath: string;
  };
}
