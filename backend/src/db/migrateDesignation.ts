import 'dotenv/config';
import { prisma } from './prisma.js';

async function migrate() {
  console.log('⏳ Running safe migration to add designation column back to User table on Supabase...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
    `);

    console.log('✅ Successfully added designation column back to User table on Supabase!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
