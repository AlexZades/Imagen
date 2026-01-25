-- Remove triggers that reference ImageSimpleTag
DROP TRIGGER IF EXISTS auto_populate_simple_tags ON "Image";
DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag";
DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag";

-- Remove functions that reference ImageSimpleTag
DROP FUNCTION IF EXISTS auto_populate_image_simple_tags();
DROP FUNCTION IF EXISTS increment_simple_tag_usage();
DROP FUNCTION IF EXISTS decrement_simple_tag_usage();

-- Drop the ImageSimpleTag table if it exists
DROP TABLE IF EXISTS "ImageSimpleTag" CASCADE;

-- Drop the SimpleTag table if it exists (no longer needed)
DROP TABLE IF EXISTS "SimpleTag" CASCADE;