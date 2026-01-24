# Imagen: Selfhosted - Image Hosting Platform

A self-hosted image hosting and browsing platform with AI-powered image generation using ComfyUI and a tag system similar to pixiv. I made this for myself using dyad but if it sounds like something you want to run feel free to try it.

Users can't directly generate images using this service, instead the service generates images based on the tags and parameters of uploaded and liked images. In other words, new images are generated based on user preferences. 

## Requirements
You need a computer capable of running SDXL models comfortably or you will frequently run into OOM errors. (16gb of vram or more)
I've only tested this on NVIDIA gpus so I'm not sure if it will run on other hardware.

## Features

- **Image Hosting**: Upload and share images 
- **Image Generation**: AI Generated images using ComfyUI with LoRA support 
- **Auto-Generation**: Automated image generation for all users based on preferences
- **User System**: Registration, login, and user profiles
- **Like/Dislike**: Engage with images through likes and dislikes
- **Search & Filter**: Find images by tags, styles, and simple tags
- **Admin Panel**: Manage tags, styles, and test generation features
- **Responsive Design**: Works on desktop and mobile devices
- **S3 Bucketsupport**: Optional support for storing images using s3 buckets (either on AWS or using seaweedfile)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS + Shadcn/UI
- **Thumbnails**: Sharp
- **Authentication**: Custom JWT-less auth with localStorage
- **Image Generation**: ComfyUI API for image generation
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Docker & Docker Compose (optional, for containerized deployment)
- ComfyUI instance with the BentoML Confy-Pack plugin for API support (the default ComfyUI is not compatible)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/AlexZades/Imagen.git
cd Imagen
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/imagen?schema=public"

# Port (for webservice)
PORT=4414

# ComfyUI API (for generation features)
COMFYUI_API_URL="http://your-comfyui-instance:port"

# Auto-generation secret (for scheduled generation)
AUTO_GENERATION_SECRET="your-secret-token-here"

# Auto-run migrations on startup (Docker only)
AUTO_MIGRATE=true
```

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:4414` 

## Docker Deployment

### Quick Start (Automatic Migrations)

```bash
# Just start - migrations run automatically
docker compose up -d

# View logs
docker compose logs -f web

# Stop
docker compose down
```

### Migration Control

The `AUTO_MIGRATE` environment variable controls whether migrations run on startup:

```yaml
environment:
  - AUTO_MIGRATE=true   # Run migrations on every startup (default)
  # - AUTO_MIGRATE=false  # Skip migrations (manual control)
```

**When to use AUTO_MIGRATE:**

- ✅ **true** (recommended for self-hosted): Simple, automatic, works great for single-instance deployments
- ❌ **false**: For advanced setups with multiple replicas or manual migration control

### Manual Migration Control

If you prefer to run migrations manually:

```bash
# Disable auto-migrations in docker-compose.yml
environment:
  - AUTO_MIGRATE=false

# Run migrations manually when needed
docker compose exec web npx prisma migrate deploy
```

### Production Deployment Workflow

**Simple approach (AUTO_MIGRATE=true):**
```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
docker compose up -d --build
```

**Manual approach (AUTO_MIGRATE=false):**
```bash
# 1. Pull latest code
git pull

# 2. Rebuild image
docker compose build

# 3. Run migrations
docker compose exec web npx prisma migrate deploy

# 4. Restart the app
docker compose up -d
```

### Environment Variables for Docker

Update `docker-compose.yml` with your configuration:

```yaml
environment:
  DATABASE_URL: "postgresql://admin:password@postgres:5432/imagen?schema=public"
  COMFYUI_API_URL: "http://your-comfyui:8188"
  AUTO_GENERATION_SECRET: "your-secret-token"
  AUTO_MIGRATE: "true"
  PORT: 4414
```

### Using GitHub Container Registry

If you're using the pre-built image from GHCR:

```bash
# Pull the latest image
docker pull ghcr.io/alexzades/alexzades:latest

# Start with auto-migrations
docker run -d \
  -p 4144:4144 \
  -e DATABASE_URL="your-database-url" \
  -e COMFYUI_API_URL="your-comfyui-url" \
  -e AUTO_MIGRATE=true \
  -v /path/to/uploads:/app/public/uploads \
  ghcr.io/alexzades/alexzades:latest
```

## Database Schema

### Core Tables
- **User**: User accounts and authentication
- **Image**: Uploaded and generated images
- **Tag**: LoRA-based tags for generation
- **Style**: Model/checkpoint styles
- **Like**: User likes/dislikes on images

### Simple Tags (Automatic Tracking)
- **SimpleTag**: Unique tags with automatic usage counting
- **ImageSimpleTag**: Junction table linking images to simple tags

Simple tags are automatically tracked using PostgreSQL triggers - no application code needed.

## Features Guide

### Image Upload 

Use this initially to seed your server with tags and images.

1. Click "Upload" in the navbar
2. Drag & drop or select an image
3. Add title, description, and tags
4. Select a style
5. Upload

### AI Generation (Admin)

Admins can generate images through the web interface.

1. Go to Admin Panel → Test Generator
2. Select tags (LoRAs) and style (model)
3. Enter prompt tags
4. Generate

### Auto-Generation (run as a cron job on your server)

This is kinda the main thing. 
Automatically generates images for all users based on their preferences:

1. **Random Generation**: Uses random tags and styles
2. **Close Recommendations**: Based on liked images
3. **Mixed Recommendations**: Combines preferences

Trigger via API:
```bash
curl -X POST http://localhost:4414/api/auto-generate \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

## Setup Generation as Admin

You will need to download the models and loras you want to use. Once downloaded you can link the file names to tags/styles using the admin panel.

### Tag Management (loras)
- Create tags with LoRA configurations
- Set min/max strength ranges
- Add forced prompt tags (these will always be included in the prompt for generation)
- Configure up to 4 LoRAs per tag

### Style Management (models)
- Create styles with checkpoint names
- Add descriptions if you want

### Test Generator
This is a quick way to test if your endpoints are setup. You can use it to test generate images.

### Auto-Generation Test
- Test generation for current user
- View detailed generation reports
- Monitor success/failure rates

## Security Notes

This project is a mess so don't deploy it as a production service (just don't)

- Passwords are hashed using SHA-256
- First registered user becomes admin automatically
- Admin-only routes are protected
- File uploads are validated and sanitized
- SQL injection protected by Prisma

## Migration Strategies

### AUTO_MIGRATE=true (Recommended for Self-Hosted)

**Pros:**
- ✅ Simple - just restart the container
- ✅ No manual steps
- ✅ Perfect for single-instance deployments
- ✅ Migrations are idempotent (safe to run multiple times)

**Cons:**
- ❌ Slightly slower startup (only on first run or when migrations exist)
- ❌ Not ideal for multi-replica deployments

### AUTO_MIGRATE=false (Advanced)

**Pros:**
- ✅ Faster startups
- ✅ Full control over when migrations run
- ✅ Better for multi-replica setups

**Cons:**
- ❌ Requires manual migration step
- ❌ More complex deployment workflow

## Troubleshooting

### ComfyUI Connection Issues

- Ensure ComfyUI is running and accessible
- Check COMFYUI_API_URL is correct
- Verify API is enabled in ComfyUI settings

### Database Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Force migrations (if AUTO_MIGRATE is disabled)
docker compose exec web npx prisma migrate deploy

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
npx prisma migrate reset
```

### Migration Logs

Check container logs to see migration output:
```bash
docker compose logs web
```

You should see:
```
🚀 Starting PixelVault...
🔄 AUTO_MIGRATE enabled - running database migrations...
✅ Migrations complete!
```

## Contributing

1. Do it at your own risk, I am a trainwreck of a developer so I could use the help.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub (please include logs)
