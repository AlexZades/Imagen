-- Add updatedAt column to User table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        -- Update existing rows to have updatedAt equal to createdAt
        UPDATE "User" SET "updatedAt" = "createdAt";
    END IF;
END $$;

-- Add updatedAt column to Tag table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tag' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "Tag" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        UPDATE "Tag" SET "updatedAt" = "createdAt";
    END IF;
END $$;

-- Add updatedAt column to Style table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Style' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "Style" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        UPDATE "Style" SET "updatedAt" = "createdAt";
    END IF;
END $$;

-- Add updatedAt column to GenerationConfig table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GenerationConfig' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "GenerationConfig" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        UPDATE "GenerationConfig" SET "updatedAt" = "createdAt";
    END IF;
END $$;