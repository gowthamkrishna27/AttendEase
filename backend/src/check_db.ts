import { prisma } from './db/prisma.js';

async function main() {
  const users = await prisma.user.count();
  const requests = await prisma.request.count();
  const subs = await prisma.attendanceSubmission.count();
  const recs = await prisma.attendanceRecord.count();
  const latestSub = await prisma.attendanceSubmission.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { markedBy: true, records: true }
  });

  console.log('=== DATABASE VERIFICATION ===');
  console.log('Total Users:', users);
  console.log('Total Requests:', requests);
  console.log('Total Attendance Submissions:', subs);
  console.log('Total Attendance Student Records:', recs);

  if (latestSub) {
    console.log('\nLatest Attendance Submission:');
    console.log('ID:', latestSub.id);
    console.log('Date:', latestSub.date);
    console.log('Section:', latestSub.section);
    console.log('Year:', latestSub.year);
    console.log('Periods:', latestSub.periods);
    console.log('Marked By:', latestSub.markedBy.name);
    console.log('Total Student Records marked:', latestSub.records.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
