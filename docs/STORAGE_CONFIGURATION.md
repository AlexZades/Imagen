# Storage Configuration Guide

This application supports two storage backends for image storage:

1. **Local Storage** (default) - Files are stored on the local filesystem
2. **S3-Compatible Storage** - Files are stored in an S3-compatible service like SeaweedFS, MinIO, or AWS S3

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | Storage backend: `local` or `s3` | `local` |
| `S3_ENDPOINT` | S3 API endpoint URL | - |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | S3 access key | - |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | - |
| `S3_BUCKET_NAME` | S3 bucket name | - |
| `S3_PUBLIC_URL` | Public URL for accessing files (optional) | Derived from endpoint |
| `S3_FORCE_PATH_STYLE` | Use path-style URLs (for S3-compatible services) | `true` |

## Local Storage

Local storage is the default and requires no additional configuration. Files are stored in `public/uploads/` and served directly by Next.js.

```env
STORAGE_PROVIDER=local
```

### Volume Mapping (Docker)

When using Docker, map the uploads directory to persist files:

```yaml
volumes:
  - ./uploads:/app/public/uploads
```

## S3-Compatible Storage (SeaweedFS)

### SeaweedFS Setup

1. **Start SeaweedFS** with S3 support:

```bash
# Using Docker
docker run -d \
  --name seaweedfs \
  -p 9333:9333 \
  -p 8333:8333 \
  -p 8080:8080 \
  -v seaweedfs_data:/data \
  chrislusf/seaweedfs:latest \
  server -s3 -dir=/data
```

2. **Create a bucket** (SeaweedFS auto-creates buckets on first write, but you can pre-create):

```bash
# Using AWS CLI
aws --endpoint-url http://localhost:8333 s3 mb s3://pixelvault
```

3. **Configure the application**:

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://seaweedfs:8333
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=any
S3_SECRET_ACCESS_KEY=any
S3_BUCKET_NAME=pixelvault
S3_PUBLIC_URL=http://your-public-seaweedfs-url:8333/pixelvault
S3_FORCE_PATH_STYLE=true
```

> **Note**: SeaweedFS by default doesn't require authentication. Set `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` to any value, or configure SeaweedFS with authentication.

### Docker Compose Example

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "4144:4144"
    environment:
      - STORAGE_PROVIDER=s3
      - S3_ENDPOINT=http://seaweedfs:8333
      - S3_REGION=us-east-1
      - S3_ACCESS_KEY_ID=admin
      - S3_SECRET_ACCESS_KEY=admin
      - S3_BUCKET_NAME=pixelvault
      - S3_PUBLIC_URL=http://localhost:8333/pixelvault
      - S3_FORCE_PATH_STYLE=true
    depends_on:
      - seaweedfs

  seaweedfs:
    image: chrislusf/seaweedfs:latest
    ports:
      - "9333:9333"   # Master server
      - "8333:8333"   # S3 API
      - "8080:8080"   # Volume server
    command: "server -s3 -dir=/data"
    volumes:
      - seaweedfs_data:/data

volumes:
  seaweedfs_data:
```

## AWS S3

For AWS S3, use virtual-hosted style URLs:

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-aws-access-key
S3_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-bucket-name
S3_FORCE_PATH_STYLE=false
```

### Bucket Policy

Ensure your bucket allows public read access for images:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## MinIO

MinIO is another popular S3-compatible storage option:

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=pixelvault
S3_PUBLIC_URL=http://localhost:9000/pixelvault
S3_FORCE_PATH_STYLE=true
```

## Migration Between Storage Backends

### Local to S3

1. Set up your S3-compatible storage
2. Upload existing files to S3:
   ```bash
   aws --endpoint-url http://your-s3-endpoint s3 sync ./uploads s3://your-bucket/
   ```
3. Update environment variables to use S3
4. Restart the application

### S3 to Local

1. Download files from S3:
   ```bash
   aws --endpoint-url http://your-s3-endpoint s3 sync s3://your-bucket/ ./uploads
   ```
2. Update `STORAGE_PROVIDER=local`
3. Restart the application

## URL Handling

- **Local Storage**: Images are served via `/uploads/filename.png`
- **S3 Storage**: Images are served directly from the S3 endpoint (e.g., `http://s3-endpoint/bucket/filename.png`)

The application stores the full URL in the database, so switching storage providers requires updating existing image URLs in the database or using the migration scripts.

## Troubleshooting

### Images not loading with S3

1. Check that `S3_PUBLIC_URL` is accessible from the browser
2. Verify bucket permissions allow public read
3. Check browser console for CORS errors

### CORS Issues

If using SeaweedFS or MinIO, you may need to configure CORS:

**SeaweedFS**: Add `-s3.config` with CORS settings
**MinIO**: Use `mc admin config set` to configure CORS

### Connection Refused

Ensure the S3 endpoint is reachable from the application container. In Docker, use the service name (e.g., `seaweedfs`) instead of `localhost`.
