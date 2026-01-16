-- CreateTable
CREATE TABLE IF NOT EXISTS "ImageSimpleTag" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "simpleTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageSimpleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ImageSimpleTag_imageId_simpleTag_key" ON "ImageSimpleTag"("imageId", "simpleTag");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImageSimpleTag_imageId_idx" ON "ImageSimpleTag"("imageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImageSimpleTag_simpleTag_idx" ON "ImageSimpleTag"("simpleTag");

-- AddForeignKey
ALTER TABLE "ImageSimpleTag" ADD CONSTRAINT "ImageSimpleTag_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageSimpleTag" ADD CONSTRAINT "ImageSimpleTag_simpleTag_fkey" FOREIGN KEY ("simpleTag") REFERENCES "SimpleTag"("tag") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create trigger function to increment simple tag usage
CREATE OR REPLACE FUNCTION increment_simple_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "SimpleTag" (id, tag, "usageCount", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), NEW."simpleTag", 1, NOW(), NOW())
  ON CONFLICT (tag) DO UPDATE
  SET "usageCount" = "SimpleTag"."usageCount" + 1,
      "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to decrement simple tag usage
CREATE OR REPLACE FUNCTION decrement_simple_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "SimpleTag"
  SET "usageCount" = GREATEST(0, "usageCount" - 1),
      "updatedAt" = NOW()
  WHERE tag = OLD."simpleTag";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag";
CREATE TRIGGER simple_tag_usage_increment
AFTER INSERT ON "ImageSimpleTag"
FOR EACH ROW
EXECUTE FUNCTION increment_simple_tag_usage();

DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag";
CREATE TRIGGER simple_tag_usage_decrement
AFTER DELETE ON "ImageSimpleTag"
FOR EACH ROW
EXECUTE FUNCTION decrement_simple_tag_usage();