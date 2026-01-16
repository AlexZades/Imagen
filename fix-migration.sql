-- Drop triggers that depend on the function
DROP TRIGGER IF EXISTS image_simple_tags_insert ON "Image";
DROP TRIGGER IF EXISTS image_simple_tags_update ON "Image";

-- Drop the function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS auto_populate_image_simple_tags() CASCADE;

-- Also drop any other simple tag related triggers/functions that might exist
DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag";
DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag";
DROP FUNCTION IF EXISTS increment_simple_tag_usage() CASCADE;
DROP FUNCTION IF EXISTS decrement_simple_tag_usage() CASCADE;

-- Drop the ImageSimpleTag and SimpleTag tables if they exist
DROP TABLE IF EXISTS "ImageSimpleTag" CASCADE;
DROP TABLE IF EXISTS "SimpleTag" CASCADE;