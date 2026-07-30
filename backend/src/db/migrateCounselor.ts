import 'dotenv/config';
import { prisma } from './prisma.js';

async function migrate() {
  console.log('⏳ Running safe migration for counselorId on Supabase PostgreSQL...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "counselorId" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_counselorId_idx" ON "User"("counselorId");
    `);

    console.log('✅ Safely added counselorId column to User table on Supabase!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
