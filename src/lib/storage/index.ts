import { StorageProvider, StorageProviderType } from './types';
import { LocalStorageProvider } from './local-provider';
import { S3StorageProvider } from './s3-provider';

// Singleton instance
let storageProviderInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider type from environment variables
 */
export function getStorageProviderType(): StorageProviderType {
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase();
  
  if (provider === 's3' || provider === 'seaweedfs') {
    return 's3';
  }
  
  return 'local';
}

/**
 * Check if S3 storage is properly configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

/**
 * Get the storage provider instance (singleton)
 * 
 * The provider is determined by the STORAGE_PROVIDER environment variable:
 * - 'local' (default): Uses local filesystem storage
 * - 's3' or 'seaweedfs': Uses S3-compatible storage
 * 
 * For S3 storage, the following environment variables are required:
 * - S3_ENDPOINT: The S3 endpoint URL (e.g., http://seaweedfs:8333)
 * - S3_REGION: The S3 region (e.g., us-east-1)
 * - S3_ACCESS_KEY_ID: The access key ID
 * - S3_SECRET_ACCESS_KEY: The secret access key
 * - S3_BUCKET_NAME: The bucket name
 * - S3_PUBLIC_URL: (Optional) The public URL for accessing files
 */
export function getStorageProvider(): StorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const providerType = getStorageProviderType();

  if (providerType === 's3') {
    // Validate required S3 configuration
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucketName = process.env.S3_BUCKET_NAME;
    const publicUrl = process.env.S3_PUBLIC_URL;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error('[Storage] S3 storage is configured but missing required environment variables.');
      console.error('[Storage] Required: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME');
      console.error('[Storage] Falling back to local storage.');
      
      storageProviderInstance = new LocalStorageProvider();
      return storageProviderInstance;
    }

    console.log(`[Storage] Using S3 storage provider (endpoint: ${endpoint}, bucket: ${bucketName})`);
    
    storageProviderInstance = new S3StorageProvider({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicUrl,
      forcePathStyle,
    });
  } else {
    console.log('[Storage] Using local storage provider');
    storageProviderInstance = new LocalStorageProvider();
  }

  return storageProviderInstance;
}

/**
 * Reset the storage provider instance (useful for testing)
 */
export function resetStorageProvider(): void {
  storageProviderInstance = null;
}

// Re-export types and providers
export type { StorageProvider, StorageProviderType, UploadResult } from './types';
export { LocalStorageProvider } from './local-provider';
export { S3StorageProvider } from './s3-provider';