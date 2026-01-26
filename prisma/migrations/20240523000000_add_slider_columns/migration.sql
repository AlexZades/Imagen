-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "description" TEXT;
ALTER TABLE "Tag" ADD COLUMN "slider" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tag" ADD COLUMN "slider_high_text" TEXT;
ALTER TABLE "Tag" ADD COLUMN "slider_low_text" TEXT;
