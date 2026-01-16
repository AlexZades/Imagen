-- Add updatedAt column to Image table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Image' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "Image" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing rows to have updatedAt equal to createdAt
UPDATE "Image" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;