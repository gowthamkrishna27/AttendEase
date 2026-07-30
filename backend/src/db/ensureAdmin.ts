import 'dotenv/config';
import { prisma } from './prisma.js';

async function main() {
  console.log('⏳ Ensuring Admin user exists in Supabase PostgreSQL...');

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@college.edu' },
          { email: 'admin@srkrec.ac.in' },
          { userId: 'admin-001' },
          { role: 'admin' },
        ],
      },
    });

    if (existing) {
      console.log(`Found existing admin user: ${existing.email} (ID: ${existing.userId})`);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: 'admin@college.edu',
          password: '1234',
          role: 'admin',
          isActive: true,
        },
      });
      console.log(`✅ Admin password reset to '1234' for email: ${updated.email}`);
    } else {
      const created = await prisma.user.create({
        data: {
          userId: 'admin-001',
          name: 'System Admin',
          email: 'admin@college.edu',
          role: 'admin',
          department: 'Administration',
          password: '1234',
          avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
          isActive: true,
        },
      });
      console.log(`✅ Created new Admin account: ${created.email} (Password: '1234')`);
    }
  } catch (err) {
    console.error('❌ Error ensuring admin user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
