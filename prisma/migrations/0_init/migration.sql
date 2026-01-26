-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credits_free" INTEGER NOT NULL DEFAULT 0,
    "credits_free_last_grant_at" TIMESTAMP(3),
    "nsfwEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "promptTags" TEXT,
    "content_rating" TEXT NOT NULL DEFAULT 'safe',
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "filename" TEXT,
    "thumbnailFilename" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "dislikeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minStrength" DOUBLE PRECISION,
    "maxStrength" DOUBLE PRECISION,
    "forcedPromptTags" TEXT,
    "nsfw" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Style" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "checkpointName" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "isLike" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageTag" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageStyle" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimpleTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimpleTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedBy" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Style_name_key" ON "Style"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_imageId_key" ON "Like"("userId", "imageId");
CREATE INDEX "Like_imageId_idx" ON "Like"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageTag_imageId_tagId_key" ON "ImageTag"("imageId", "tagId");
CREATE INDEX "ImageTag_tagId_idx" ON "ImageTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageStyle_imageId_styleId_key" ON "ImageStyle"("imageId", "styleId");
CREATE INDEX "ImageStyle_styleId_idx" ON "ImageStyle"("styleId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationConfig_key_key" ON "GenerationConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SimpleTag_tag_key" ON "SimpleTag"("tag");
CREATE INDEX "SimpleTag_usageCount_idx" ON "SimpleTag"("usageCount");
CREATE INDEX "SimpleTag_category_idx" ON "SimpleTag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");
CREATE UNIQUE INDEX "AccessKey_redeemedBy_key" ON "AccessKey"("redeemedBy");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageTag" ADD CONSTRAINT "ImageTag_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImageTag" ADD CONSTRAINT "ImageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageStyle" ADD CONSTRAINT "ImageStyle_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImageStyle" ADD CONSTRAINT "ImageStyle_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessKey" ADD CONSTRAINT "AccessKey_redeemedBy_fkey" FOREIGN KEY ("redeemedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TRIGGER: Auto-populate SimpleTag directly from Image.promptTags
-- Function to parse promptTags and update SimpleTag counts
CREATE OR REPLACE FUNCTION auto_populate_simple_tags_from_prompt()
RETURNS TRIGGER AS $$
DECLARE
  tag_text TEXT;
  tag_array TEXT[];
  old_tag_array TEXT[];
BEGIN
  -- Handle INSERT: increment counts for new tags
  IF TG_OP = 'INSERT' THEN
    IF NEW."promptTags" IS NOT NULL AND trim(NEW."promptTags") != '' THEN
      tag_array := string_to_array(NEW."promptTags", ',');
      
      FOREACH tag_text IN ARRAY tag_array
      LOOP
        tag_text := lower(trim(tag_text));
        
        IF tag_text != '' THEN
          -- Insert or increment
          INSERT INTO "SimpleTag" ("id", "tag", "usageCount", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            tag_text,
            1,
            NOW(),
            NOW()
          )
          ON CONFLICT ("tag") DO UPDATE
          SET "usageCount" = "SimpleTag"."usageCount" + 1,
              "updatedAt" = NOW();
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Handle UPDATE: adjust counts for changed tags
  IF TG_OP = 'UPDATE' AND OLD."promptTags" IS DISTINCT FROM NEW."promptTags" THEN
    -- Decrement old tags
    IF OLD."promptTags" IS NOT NULL AND trim(OLD."promptTags") != '' THEN
      old_tag_array := string_to_array(OLD."promptTags", ',');
      
      FOREACH tag_text IN ARRAY old_tag_array
      LOOP
        tag_text := lower(trim(tag_text));
        
        IF tag_text != '' THEN
          UPDATE "SimpleTag"
          SET "usageCount" = GREATEST(0, "usageCount" - 1),
              "updatedAt" = NOW()
          WHERE "tag" = tag_text;
        END IF;
      END LOOP;
    END IF;
    
    -- Increment new tags
    IF NEW."promptTags" IS NOT NULL AND trim(NEW."promptTags") != '' THEN
      tag_array := string_to_array(NEW."promptTags", ',');
      
      FOREACH tag_text IN ARRAY tag_array
      LOOP
        tag_text := lower(trim(tag_text));
        
        IF tag_text != '' THEN
          INSERT INTO "SimpleTag" ("id", "tag", "usageCount", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            tag_text,
            1,
            NOW(),
            NOW()
          )
          ON CONFLICT ("tag") DO UPDATE
          SET "usageCount" = "SimpleTag"."usageCount" + 1,
              "updatedAt" = NOW();
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Handle DELETE: decrement counts
  IF TG_OP = 'DELETE' THEN
    IF OLD."promptTags" IS NOT NULL AND trim(OLD."promptTags") != '' THEN
      old_tag_array := string_to_array(OLD."promptTags", ',');
      
      FOREACH tag_text IN ARRAY old_tag_array
      LOOP
        tag_text := lower(trim(tag_text));
        
        IF tag_text != '' THEN
          UPDATE "SimpleTag"
          SET "usageCount" = GREATEST(0, "usageCount" - 1),
              "updatedAt" = NOW()
          WHERE "tag" = tag_text;
        END IF;
      END LOOP;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger on Image table
DROP TRIGGER IF EXISTS auto_populate_simple_tags ON "Image";
CREATE TRIGGER auto_populate_simple_tags
  AFTER INSERT OR UPDATE OR DELETE ON "Image"
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_simple_tags_from_prompt();