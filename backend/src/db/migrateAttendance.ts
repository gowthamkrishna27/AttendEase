import 'dotenv/config';
import { prisma } from './prisma.js';

async function migrate() {
  console.log('⏳ Running safe, non-destructive migration for Attendance tables on Supabase PostgreSQL...');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AttendanceSubmission" (
          "id" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "section" TEXT NOT NULL,
          "year" TEXT NOT NULL DEFAULT '3rd Year',
          "periods" TEXT NOT NULL,
          "periodLabel" TEXT NOT NULL,
          "markedById" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AttendanceSubmission_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
          "id" TEXT NOT NULL,
          "submissionId" TEXT NOT NULL,
          "rollNumber" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceSubmission_date_section_periods_key" 
      ON "AttendanceSubmission"("date", "section", "periods");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AttendanceSubmission_date_section_idx" 
      ON "AttendanceSubmission"("date", "section");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AttendanceSubmission_markedById_idx" 
      ON "AttendanceSubmission"("markedById");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_submissionId_rollNumber_key" 
      ON "AttendanceRecord"("submissionId", "rollNumber");
    `);

    console.log('✅ Safely created AttendanceSubmission and AttendanceRecord tables on Supabase!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
