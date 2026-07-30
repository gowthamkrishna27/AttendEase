import 'dotenv/config';
import { prisma } from './prisma.js';

async function main() {
  console.log('⏳ Updating all student departments to CSIT in Supabase PostgreSQL...');

  try {
    const result = await prisma.user.updateMany({
      where: { role: 'student' },
      data: { department: 'CSIT' },
    });

    console.log(`✅ Successfully updated ${result.count} student(s) department to 'CSIT'!`);
  } catch (err) {
    console.error('❌ Failed to update student departments:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
