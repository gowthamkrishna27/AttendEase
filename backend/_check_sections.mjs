import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

try {
  const rows = await p.$queryRaw`
    SELECT section, department, COUNT(*)::int as count
    FROM "User"
    WHERE role = 'student'
    GROUP BY section, department
    ORDER BY department, section
  `;
  console.log('=== DB section distribution ===');
  console.log(JSON.stringify(rows, null, 2));
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await p.$disconnect();
  await pool.end();
}
