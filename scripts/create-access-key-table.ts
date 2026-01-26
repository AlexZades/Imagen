import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAccessKeyTable() {
  console.log('🔄 Creating AccessKey table...');

  try {
    // Check if table exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'AccessKey'
      );
    `;
    
    // @ts-ignore
    const exists = result[0].exists;

    if (exists) {
        console.log('✅ AccessKey table already exists.');
        return;
    }

    // Create the table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "AccessKey" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
        "redeemedBy" TEXT,
        "redeemedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
        CONSTRAINT "AccessKey_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create Indexes
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "AccessKey_redeemedBy_key" ON "AccessKey"("redeemedBy");`);

    // Add Foreign Key
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AccessKey" ADD CONSTRAINT "AccessKey_redeemedBy_fkey" 
      FOREIGN KEY ("redeemedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    console.log('✅ AccessKey table created successfully!');

  } catch (error: any) {
    console.error('❌ Error creating table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAccessKeyTable();
