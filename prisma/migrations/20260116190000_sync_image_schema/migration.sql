-- This migration syncs the Image table with the Prisma schema
-- The Image model does NOT have updatedAt, so we don't need to add it

-- Verify the Image table has all required columns
-- If any are missing, they will be added

-- Check and add missing columns if needed (these should already exist)
DO $$ 
BEGIN
    -- Ensure viewCount exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Image' AND column_name = 'viewCount'
    ) THEN
        ALTER TABLE "Image" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure likeCount exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Image' AND column_name = 'likeCount'
    ) THEN
        ALTER TABLE "Image" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure dislikeCount exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Image' AND column_name = 'dislikeCount'
    ) THEN
        ALTER TABLE "Image" ADD COLUMN "dislikeCount" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;