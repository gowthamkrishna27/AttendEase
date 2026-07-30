import 'dotenv/config';
import { prisma } from './prisma.js';

async function main() {
  console.log('⏳ Restoring "designation" column in Supabase PostgreSQL User table...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
    `);

    console.log('✅ Successfully added designation column back to User table on Supabase PostgreSQL!');
  } catch (err) {
    console.error('❌ Failed to restore designation column:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
