-- CreateTable: ImageSimpleTag junction table
CREATE TABLE IF NOT EXISTS "ImageSimpleTag" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "simpleTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageSimpleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on imageId + simpleTag combination
CREATE UNIQUE INDEX IF NOT EXISTS "ImageSimpleTag_imageId_simpleTag_key" ON "ImageSimpleTag"("imageId", "simpleTag");

-- CreateIndex: Index on simpleTag for faster lookups
CREATE INDEX IF NOT EXISTS "ImageSimpleTag_simpleTag_idx" ON "ImageSimpleTag"("simpleTag");

-- CreateIndex: Index on imageId for faster lookups
CREATE INDEX IF NOT EXISTS "ImageSimpleTag_imageId_idx" ON "ImageSimpleTag"("imageId");

-- AddForeignKey: Link to Image table with cascade delete
ALTER TABLE "ImageSimpleTag" ADD CONSTRAINT "ImageSimpleTag_imageId_fkey" 
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Function to parse comma-delimited tags and create ImageSimpleTag records
CREATE OR REPLACE FUNCTION auto_populate_image_simple_tags()
RETURNS TRIGGER AS $$
DECLARE
  tag_text TEXT;
  tag_array TEXT[];
BEGIN
  -- Only process if promptTags is not null and not empty
  IF NEW."promptTags" IS NOT NULL AND trim(NEW."promptTags") != '' THEN
    
    -- Split comma-delimited string into array and clean each tag
    tag_array := string_to_array(NEW."promptTags", ',');
    
    -- Loop through each tag
    FOREACH tag_text IN ARRAY tag_array
    LOOP
      -- Trim whitespace and convert to lowercase
      tag_text := lower(trim(tag_text));
      
      -- Skip empty tags
      IF tag_text != '' THEN
        -- Insert into ImageSimpleTag (ignore duplicates)
        INSERT INTO "ImageSimpleTag" ("id", "imageId", "simpleTag", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          NEW.id,
          tag_text,
          NOW()
        )
        ON CONFLICT ("imageId", "simpleTag") DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER INSERT on Image
DROP TRIGGER IF EXISTS image_simple_tags_insert ON "Image";
CREATE TRIGGER image_simple_tags_insert
  AFTER INSERT ON "Image"
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_image_simple_tags();

-- Create trigger that fires AFTER UPDATE on Image (only when promptTags changes)
DROP TRIGGER IF EXISTS image_simple_tags_update ON "Image";
CREATE TRIGGER image_simple_tags_update
  AFTER UPDATE OF "promptTags" ON "Image"
  FOR EACH ROW
  WHEN (OLD."promptTags" IS DISTINCT FROM NEW."promptTags")
  EXECUTE FUNCTION auto_populate_image_simple_tags();

-- Note: The existing increment_simple_tag_usage and decrement_simple_tag_usage triggers
-- will automatically handle creating/updating SimpleTag records when ImageSimpleTag records are created/deleted