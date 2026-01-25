-- AlterTable
ALTER TABLE "Image" ADD COLUMN "content_rating" TEXT NOT NULL DEFAULT 'safe';

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "nsfw" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "nsfwEnabled" BOOLEAN NOT NULL DEFAULT false;
