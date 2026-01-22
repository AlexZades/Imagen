import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { StorageProvider, UploadResult } from './types';

/**
 * S3-Compatible Storage Provider
 * 
 * Stores files in an S3-compatible storage service like SeaweedFS, MinIO, or AWS S3.
 * Uses the AWS SDK v3 for S3 operations.
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl?: string;
    forcePathStyle?: boolean;
  }) {
    this.bucketName = config.bucketName;
    
    // Determine the public URL for accessing files
    // If publicUrl is provided, use it; otherwise construct from endpoint
    if (config.publicUrl) {
      this.publicUrl = config.publicUrl.replace(/\/$/, ''); // Remove trailing slash
    } else {
      // For path-style URLs (common with SeaweedFS/MinIO)
      const endpoint = config.endpoint.replace(/\/$/, '');
      this.publicUrl = `${endpoint}/${config.bucketName}`;
    }

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true, // Default to path-style for S3-compatible services
    });

    console.log(`[S3StorageProvider] Initialized with endpoint: ${config.endpoint}, bucket: ${config.bucketName}`);
  }

  /**
   * Ensure the bucket exists, creating it if necessary.
   * This is called lazily before operations that require the bucket.
   */
  private async ensureBucket(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Check if bucket exists
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        console.log(`[S3StorageProvider] Bucket '${this.bucketName}' exists.`);
      } catch (error: any) {
        // If bucket not found (404), create it
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          console.log(`[S3StorageProvider] Bucket '${this.bucketName}' not found. Creating...`);
          try {
            await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
            console.log(`[S3StorageProvider] Bucket '${this.bucketName}' created successfully.`);
          } catch (createError) {
            console.error(`[S3StorageProvider] Failed to create bucket '${this.bucketName}':`, createError);
            throw createError;
          }
        } else {
          // Other errors (e.g., permissions, connection)
          console.error(`[S3StorageProvider] Error checking bucket '${this.bucketName}':`, error);
          throw error;
        }
      }
    })();

    return this.initializationPromise;
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    await this.ensureBucket();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Make the object publicly readable
      ACL: 'public-read',
    });

    try {
      await this.client.send(command);
      
      const url = `${this.publicUrl}/${key}`;
      
      console.log(`[S3StorageProvider] Uploaded file: ${key} -> ${url}`);
      
      return {
        url,
        key,
      };
    } catch (error) {
      console.error(`[S3StorageProvider] Error uploading file ${key}:`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    // We don't necessarily need to create the bucket to delete a file,
    // but checking ensures we don't error out on a missing bucket.
    // However, to keep it simple and consistent, we'll ensure it exists.
    try {
      await this.ensureBucket();
    } catch (error) {
      // If we can't ensure the bucket (e.g. connection error), 
      // we probably can't delete anyway.
      // But if it was just 404 on creation, we can ignore delete.
      console.warn(`[S3StorageProvider] Could not ensure bucket for deletion:`, error);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
      console.log(`[S3StorageProvider] Deleted file: ${key}`);
    } catch (error) {
      console.error(`[S3StorageProvider] Error deleting file ${key}:`, error);
      // Don't throw - file might already be deleted
    }
  }

  async fileExists(key: string): Promise<boolean> {
    // For checking existence, we should ensure bucket exists first,
    // otherwise HeadObject will fail with NoSuchBucket or similar.
    try {
      await this.ensureBucket();
    } catch (error) {
      // If bucket issue, assume file doesn't exist
      return false;
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error(`[S3StorageProvider] Error checking file existence ${key}:`, error);
      return false;
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      await this.ensureBucket();
    } catch (error) {
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      
      if (response.Body) {
        // Convert the readable stream to a buffer
        const chunks: Uint8Array[] = [];
        const stream = response.Body as AsyncIterable<Uint8Array>;
        
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
      }
      
      return null;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error(`[S3StorageProvider] Error getting file ${key}:`, error);
      return null;
    }
  }

  getProviderType(): 'local' | 's3' {
    return 's3';
  }

  /**
   * Get the S3 client for advanced operations
   */
  getClient(): S3Client {
    return this.client;
  }

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}