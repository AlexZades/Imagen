import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const key = process.argv[2];
  if (!key) {
    console.error('Please provide an access key as an argument.');
    console.log('Usage: npx tsx scripts/create-access-key.ts <your-key>');
    process.exit(1);
  }

  try {
    const created = await prisma.accessKey.create({
      data: {
        key,
      },
    });
    console.log(`✅ Access key created: ${created.key}`);
  } catch (error) {
    console.error('❌ Error creating access key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
