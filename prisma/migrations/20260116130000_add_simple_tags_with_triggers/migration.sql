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
CREATE TABLE "ImageSimpleTag" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "simpleTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageSimpleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimpleTag_tag_key" ON "SimpleTag"("tag");

-- CreateIndex
CREATE INDEX "SimpleTag_usageCount_idx" ON "SimpleTag"("usageCount");

-- CreateIndex
CREATE INDEX "SimpleTag_category_idx" ON "SimpleTag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ImageSimpleTag_imageId_simpleTag_key" ON "ImageSimpleTag"("imageId", "simpleTag");

-- CreateIndex
CREATE INDEX "ImageSimpleTag_simpleTag_idx" ON "ImageSimpleTag"("simpleTag");

-- CreateIndex
CREATE INDEX "ImageSimpleTag_imageId_idx" ON "ImageSimpleTag"("imageId");

-- AddForeignKey
ALTER TABLE "ImageSimpleTag" ADD CONSTRAINT "ImageSimpleTag_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create function to increment simple tag usage
CREATE OR REPLACE FUNCTION increment_simple_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to increment the usage count for the tag
  UPDATE "SimpleTag"
  SET "usageCount" = "usageCount" + 1,
      "updatedAt" = NOW()
  WHERE tag = NEW."simpleTag";
  
  -- If tag doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO "SimpleTag" (id, tag, "usageCount", "createdAt", "updatedAt")
    VALUES (
      -- Generate a CUID-like ID (simplified version)
      'c' || encode(gen_random_bytes(12), 'hex'),
      NEW."simpleTag",
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (tag) DO UPDATE
    SET "usageCount" = "SimpleTag"."usageCount" + 1,
        "updatedAt" = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT
CREATE TRIGGER simple_tag_usage_increment
AFTER INSERT ON "ImageSimpleTag"
FOR EACH ROW
EXECUTE FUNCTION increment_simple_tag_usage();

-- Create function to decrement simple tag usage
CREATE OR REPLACE FUNCTION decrement_simple_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "SimpleTag"
  SET "usageCount" = GREATEST("usageCount" - 1, 0),
      "updatedAt" = NOW()
  WHERE tag = OLD."simpleTag";
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on DELETE
CREATE TRIGGER simple_tag_usage_decrement
AFTER DELETE ON "ImageSimpleTag"
FOR EACH ROW
EXECUTE FUNCTION decrement_simple_tag_usage();