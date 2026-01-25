import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function upgradeDatabase() {
  console.log('🔄 Starting database upgrade to PascalCase schema...');

  try {
    // 1. Rename Tables
    const tableRenames = [
      { old: 'users', new: 'User' },
      { old: 'images', new: 'Image' },
      { old: 'tags', new: 'Tag' },
      { old: 'styles', new: 'Style' },
      { old: 'likes', new: 'Like' },
      { old: 'image_tags', new: 'ImageTag' },
      { old: 'image_styles', new: 'ImageStyle' },
      // SimpleTag and GenerationConfig were usually correct or handled separately
    ];

    for (const { old: oldName, new: newName } of tableRenames) {
      const exists = await tableExists(oldName);
      const newExists = await tableExists(newName);

      if (exists && !newExists) {
        console.log(`Renaming table "${oldName}" to "${newName}"...`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`);
      } else if (newExists) {
        console.log(`Table "${newName}" already exists.`);
      }
    }

    // 2. Add Missing Columns (Idempotent)
    console.log('Checking for missing columns...');
    
    // User columns
    await addColumnIfNotExists('User', 'credits_free', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfNotExists('User', 'credits_free_last_grant_at', 'TIMESTAMP(3)');
    await addColumnIfNotExists('User', 'nsfwEnabled', 'BOOLEAN NOT NULL DEFAULT false');
    
    // Image columns
    await addColumnIfNotExists('Image', 'content_rating', "TEXT NOT NULL DEFAULT 'safe'");
    
    // Tag columns
    await addColumnIfNotExists('Tag', 'forcedPromptTags', 'TEXT');
    await addColumnIfNotExists('Tag', 'nsfw', 'BOOLEAN NOT NULL DEFAULT false');

    // 3. Ensure SimpleTag table exists
    const simpleTagExists = await tableExists('SimpleTag');
    if (!simpleTagExists) {
      console.log('Creating SimpleTag table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "SimpleTag" (
          "id" TEXT NOT NULL,
          "tag" TEXT NOT NULL,
          "category" TEXT,
          "usageCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "SimpleTag_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "SimpleTag_tag_key" ON "SimpleTag"("tag");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "SimpleTag_usageCount_idx" ON "SimpleTag"("usageCount");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "SimpleTag_category_idx" ON "SimpleTag"("category");`);
    }

    // 4. Update Triggers
    console.log('Updating triggers...');
    
    // Drop old stuff
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS image_simple_tags_insert ON "Image"`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS image_simple_tags_update ON "Image"`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag"`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag"`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ImageSimpleTag" CASCADE`);

    // Create function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION auto_populate_simple_tags_from_prompt()
      RETURNS TRIGGER AS $$
      DECLARE
        tag_text TEXT;
        tag_array TEXT[];
        old_tag_array TEXT[];
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW."promptTags" IS NOT NULL AND trim(NEW."promptTags") != '' THEN
            tag_array := string_to_array(NEW."promptTags", ',');
            FOREACH tag_text IN ARRAY tag_array LOOP
              tag_text := lower(trim(tag_text));
              IF tag_text != '' THEN
                INSERT INTO "SimpleTag" ("id", "tag", "usageCount", "createdAt", "updatedAt")
                VALUES (gen_random_uuid()::text, tag_text, 1, NOW(), NOW())
                ON CONFLICT ("tag") DO UPDATE
                SET "usageCount" = "SimpleTag"."usageCount" + 1, "updatedAt" = NOW();
              END IF;
            END LOOP;
          END IF;
        END IF;

        IF TG_OP = 'UPDATE' AND OLD."promptTags" IS DISTINCT FROM NEW."promptTags" THEN
          IF OLD."promptTags" IS NOT NULL AND trim(OLD."promptTags") != '' THEN
            old_tag_array := string_to_array(OLD."promptTags", ',');
            FOREACH tag_text IN ARRAY old_tag_array LOOP
              tag_text := lower(trim(tag_text));
              IF tag_text != '' THEN
                UPDATE "SimpleTag" SET "usageCount" = GREATEST(0, "usageCount" - 1), "updatedAt" = NOW() WHERE "tag" = tag_text;
              END IF;
            END LOOP;
          END IF;
          
          IF NEW."promptTags" IS NOT NULL AND trim(NEW."promptTags") != '' THEN
            tag_array := string_to_array(NEW."promptTags", ',');
            FOREACH tag_text IN ARRAY tag_array LOOP
              tag_text := lower(trim(tag_text));
              IF tag_text != '' THEN
                INSERT INTO "SimpleTag" ("id", "tag", "usageCount", "createdAt", "updatedAt")
                VALUES (gen_random_uuid()::text, tag_text, 1, NOW(), NOW())
                ON CONFLICT ("tag") DO UPDATE
                SET "usageCount" = "SimpleTag"."usageCount" + 1, "updatedAt" = NOW();
              END IF;
            END LOOP;
          END IF;
        END IF;

        IF TG_OP = 'DELETE' THEN
          IF OLD."promptTags" IS NOT NULL AND trim(OLD."promptTags") != '' THEN
            old_tag_array := string_to_array(OLD."promptTags", ',');
            FOREACH tag_text IN ARRAY old_tag_array LOOP
              tag_text := lower(trim(tag_text));
              IF tag_text != '' THEN
                UPDATE "SimpleTag" SET "usageCount" = GREATEST(0, "usageCount" - 1), "updatedAt" = NOW() WHERE "tag" = tag_text;
              END IF;
            END LOOP;
          END IF;
          RETURN OLD;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create Trigger
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS auto_populate_simple_tags ON "Image"`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER auto_populate_simple_tags
      AFTER INSERT OR UPDATE OR DELETE ON "Image"
      FOR EACH ROW
      EXECUTE FUNCTION auto_populate_simple_tags_from_prompt();
    `);

    // 5. Clear migration history and resolve
    console.log('Resetting migration history...');
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "_prisma_migrations"`);
    } catch (e) {
        console.log('Could not truncate _prisma_migrations (maybe it does not exist yet).');
    }

    console.log('Resolving 0_init migration...');
    try {
        execSync('npx prisma migrate resolve --applied 0_init', { stdio: 'inherit' });
    } catch (error) {
        console.error('Failed to resolve migration. You may need to run "npx prisma migrate resolve --applied 0_init" manually.');
    }

    // 6. Rename Constraints (Best Effort - helps future migrations)
    // Primary keys usually named "tablename_pkey"
    const constraints = [
      { old: 'users_pkey', new: 'User_pkey' },
      { old: 'images_pkey', new: 'Image_pkey' },
      { old: 'tags_pkey', new: 'Tag_pkey' },
      { old: 'styles_pkey', new: 'Style_pkey' },
      { old: 'likes_pkey', new: 'Like_pkey' },
      { old: 'image_tags_pkey', new: 'ImageTag_pkey' },
      { old: 'image_styles_pkey', new: 'ImageStyle_pkey' },
      { old: 'users_username_key', new: 'User_username_key' },
      { old: 'users_email_key', new: 'User_email_key' },
    ];

    for (const { old: oldName, new: newName } of constraints) {
        try {
             await prisma.$executeRawUnsafe(`ALTER INDEX IF EXISTS "${oldName}" RENAME TO "${newName}"`);
        } catch (e) {
            // ignore, constraint might not exist or already renamed
        }
        // Also try renaming constraint if it differs from index
        try {
             await prisma.$executeRawUnsafe(`ALTER TABLE "User" RENAME CONSTRAINT "${oldName}" TO "${newName}"`);
        } catch (e) {}
         try {
             await prisma.$executeRawUnsafe(`ALTER TABLE "Image" RENAME CONSTRAINT "${oldName}" TO "${newName}"`);
        } catch (e) {}
        // ... simplistic approach
    }


    console.log('✅ Upgrade complete! Your database should now match the new schema.');

  } catch (error) {
    console.error('❌ Upgrade failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function tableExists(tableName: string) {
  const result = await prisma.$queryRaw<any[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    );
  `;
  return result[0].exists;
}

async function addColumnIfNotExists(table: string, column: string, type: string) {
  const result = await prisma.$queryRaw<any[]>`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = ${table} 
    AND column_name = ${column}
  `;
  
  if (result.length === 0) {
    console.log(`Adding column ${column} to ${table}...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
  }
}

upgradeDatabase();
