-- Migration: Auto-populate SimpleTag directly from Image.promptTags
-- No junction table needed!

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

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag";
DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag";
DROP TRIGGER IF EXISTS image_simple_tags_insert ON "Image";
DROP TRIGGER IF EXISTS image_simple_tags_update ON "Image";

-- Create new trigger on Image table
DROP TRIGGER IF EXISTS auto_populate_simple_tags ON "Image";
CREATE TRIGGER auto_populate_simple_tags
  AFTER INSERT OR UPDATE OR DELETE ON "Image"
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_simple_tags_from_prompt();

-- Drop ImageSimpleTag table if it exists (we don't need it!)
DROP TABLE IF EXISTS "ImageSimpleTag" CASCADE;

-- Drop old trigger functions if they exist
DROP FUNCTION IF EXISTS increment_simple_tag_usage() CASCADE;
DROP FUNCTION IF EXISTS decrement_simple_tag_usage() CASCADE;
DROP FUNCTION IF EXISTS auto_populate_image_simple_tags() CASCADE;