# Imagen:PixelVault - Image Hosting Platform

A self-hosted image hosting and browsing platform with AI-powered image generation using ComfyUI. I made this for myself using dyad but if it sounds like something you want to run feel free to try it.

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

### Quick Start

```bash
# 1. Run migrations FIRST (one-time or when updating)
docker compose run --rm migrate

# 2. Start the application
docker compose up -d

# View logs
docker compose logs -f web

# Stop
docker compose down
```

### Production Deployment Workflow

**Initial Setup:**
```bash
# 1. Build the image
docker compose build

# 2. Run migrations
docker compose run --rm migrate

# 3. Start the app
docker compose up -d
```

**Updating the Application:**
```bash
# 1. Pull latest code
git pull

# 2. Rebuild image
docker compose build

# 3. Run any new migrations
docker compose run --rm migrate

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
  PORT: 4414
```

### Using GitHub Container Registry

If you're using the pre-built image from GHCR:

```bash
# Pull the latest image
docker pull ghcr.io/alexzades/alexzades:latest

# Run migrations (using the builder stage)
docker run --rm \
  -e DATABASE_URL="your-database-url" \
  ghcr.io/alexzades/alexzades:latest \
  npx prisma migrate deploy

# Start the app
docker run -d \
  -p 4144:4144 \
  -e DATABASE_URL="your-database-url" \
  -e COMFYUI_API_URL="your-comfyui-url" \
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

## Production Deployment Best Practices

### Database Migrations

**❌ DON'T:** Run migrations inside the container at startup
**✅ DO:** Run migrations as a separate step before deploying

```bash
# Good: Separate migration step
docker compose run --rm migrate
docker compose up -d

# Bad: Migrations in CMD (causes issues with multiple replicas, slow startups)
```

### Why Separate Migrations?

1. **Multiple Replicas**: If you scale to multiple containers, each would try to run migrations simultaneously
2. **Faster Startups**: App starts immediately without waiting for migrations
3. **Better Error Handling**: Migration failures don't crash your app
4. **Rollback Safety**: You can test migrations before deploying the new app version

## Troubleshooting

### ComfyUI Connection Issues

- Ensure ComfyUI is running and accessible
- Check COMFYUI_API_URL is correct
- Verify API is enabled in ComfyUI settings

### Database Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate deploy
```

## Contributing

1. Do it at your own risk, I am a trainwreck of a developer so I could use the help.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub (please include logs)