# PixelVault - Image Hosting Platform

A self-hosted image hosting and browsing platform with AI-powered image generation using ComfyUI.

## Features

- **Image Hosting**: Upload and share images with automatic thumbnail generation
- **AI Generation**: Generate images using ComfyUI with LoRA support
- **Auto-Generation**: Automated image generation for all users based on preferences
- **Smart Tagging**: Automatic simple tags tracking with PostgreSQL triggers
- **User System**: Registration, login, and user profiles
- **Like/Dislike**: Engage with images through likes and dislikes
- **Search & Filter**: Find images by tags, styles, and simple tags
- **Admin Panel**: Manage tags, styles, and test generation features
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS + Shadcn/UI
- **Image Processing**: Sharp
- **Authentication**: Custom JWT-less auth with localStorage
- **AI Integration**: ComfyUI API for image generation
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Docker & Docker Compose (optional, for containerized deployment)
- ComfyUI instance with API enabled (for generation features)

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ImagenPlatform
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/imagen?schema=public"

# ComfyUI API (for generation features)
COMFYUI_API_URL="http://your-comfyui-instance:8188"

# Auto-generation secret (for scheduled generation)
AUTO_GENERATION_SECRET="your-secret-token-here"
```

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# (Optional) Populate simple tags from existing images
npm run populate:simple-tags
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Docker Deployment

### Using Docker Compose

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The application will be available at `http://localhost:4144`

### Environment Variables for Docker

Update `docker-compose.yml` with your configuration:

```yaml
environment:
  DATABASE_URL: "postgresql://admin:password@postgres:5432/imagen?schema=public"
  COMFYUI_API_URL: "http://your-comfyui:8188"
  AUTO_GENERATION_SECRET: "your-secret-token"
  PORT: 4144
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

1. Click "Upload" in the navbar
2. Drag & drop or select an image
3. Add title, description, and tags
4. Select a style
5. Upload

### AI Generation (Admin)

1. Go to Admin Panel → Test Generator
2. Select tags (LoRAs) and style (model)
3. Enter prompt tags
4. Generate

### Auto-Generation

Automatically generates images for all users based on their preferences:

1. **Random Generation**: Uses random tags and styles
2. **Close Recommendations**: Based on liked images
3. **Mixed Recommendations**: Combines preferences

Trigger via API:
```bash
curl -X POST http://localhost:3000/api/auto-generate \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

### Simple Tags Analytics

View tag usage statistics in Admin Panel → Simple Tags:
- Most used tags
- Tag categories
- Usage trends
- Export to CSV

## Admin Features

### Tag Management
- Create tags with LoRA configurations
- Set min/max strength ranges
- Add forced prompt tags
- Configure up to 4 LoRAs per tag

### Style Management
- Create styles with checkpoint names
- Add descriptions
- Track usage statistics

### Test Generator
- Test ComfyUI integration
- Preview generated images
- Save to database

### Auto-Generation Test
- Test generation for current user
- View detailed generation reports
- Monitor success/failure rates

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   ├── image/[id]/        # Image detail page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── search/            # Search page
│   ├── upload/            # Upload page
│   └── user/[id]/         # User profile page
├── components/            # React components
│   ├── ui/               # Shadcn/UI components
│   ├── admin/            # Admin-specific components
│   └── navbar.tsx        # Navigation bar
├── contexts/             # React contexts
│   └── auth-context.tsx  # Authentication context
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── prisma.ts        # Prisma client
│   ├── auth.ts          # Authentication utilities
│   ├── upload.ts        # Image upload utilities
│   └── auto-generation.ts # Auto-generation logic
└── styles/              # Global styles

prisma/
├── schema.prisma        # Database schema
└── migrations/          # Database migrations

scripts/
├── migrate-simple-tags.sh    # Migration script
├── verify-simple-tags.sh     # Verification script
└── populate-simple-tags.ts   # Populate existing data
```

## Security Notes

- Passwords are hashed using SHA-256
- First registered user becomes admin automatically
- Admin-only routes are protected
- File uploads are validated and sanitized
- SQL injection protected by Prisma

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Using Docker

```bash
docker build -t pixelvault .
docker run -p 3000:3000 --env-file .env pixelvault
```

### Environment Variables Checklist

- DATABASE_URL configured
- COMFYUI_API_URL configured (if using generation)
- AUTO_GENERATION_SECRET set (if using auto-generation)
- File upload directory writable
- Database migrations applied

## API Documentation

### Auto-Generation Endpoint

**POST** `/api/auto-generate`

Headers:
```
Authorization: Bearer YOUR_SECRET_TOKEN
```

Body (optional):
```json
{
  "config": {
    "imagesPerUser": 6,
    "randomCount": 2,
    "closeRecommendationsCount": 2,
    "mixedRecommendationsCount": 2
  }
}
```

Response:
```json
{
  "success": true,
  "report": {
    "totalUsers": 10,
    "successCount": 58,
    "failureCount": 2,
    "durationMs": 45000
  }
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check migrations
npx prisma migrate status
```

### Simple Tags Not Tracking

```bash
# Verify triggers exist
./scripts/verify-simple-tags.sh

# Recalculate counts
npm run populate:simple-tags
```

### ComfyUI Connection Issues

- Ensure ComfyUI is running and accessible
- Check COMFYUI_API_URL is correct
- Verify API is enabled in ComfyUI settings

## Documentation

- [Migration Guide](MIGRATION_GUIDE.md) - Database migration instructions
- [Simple Tags Summary](SIMPLE_TAGS_SUMMARY.md) - Technical overview
- [Quick Start](QUICK_START_SIMPLE_TAGS.md) - Quick reference guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Image generation powered by [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- Database ORM by [Prisma](https://www.prisma.io/)

## Support

For issues and questions:
- Check the troubleshooting section
- Review the documentation files
- Open an issue on GitHub