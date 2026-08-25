import { prisma } from './db/prisma.js';

async function main() {
  try {
    // Check what faculty userId values look like
    const facultyUsers = await prisma.user.findMany({
      where: { role: 'faculty' },
      select: { userId: true, email: true, name: true, department: true },
      take: 10,
    });
    console.log('Faculty users:', JSON.stringify(facultyUsers, null, 2));

    // Check what the request faculty assignment looks like for the request with a share link
    const requestWithShareLink = await (prisma as any).permissionRequestShareLink.findFirst({
      include: {
        request: {
          include: {
            primaryFaculty: true,
            faculties: { include: { faculty: true } },
          },
        },
      },
    });

    if (requestWithShareLink?.request) {
      const req = requestWithShareLink.request;
      console.log('\nRequest with share link:');
      console.log('  primaryFacultyId:', req.primaryFacultyId);
      console.log('  primaryFaculty.userId:', req.primaryFaculty?.userId);
      console.log('  primaryFaculty.email:', req.primaryFaculty?.email);
      console.log('  faculties:');
      req.faculties?.forEach((rf: any) => {
        console.log(`    facultyId=${rf.facultyId}, faculty.userId=${rf.faculty?.userId}, faculty.email=${rf.faculty?.email}`);
      });
    }
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    await (prisma as any).$disconnect();
  }
}

main();
