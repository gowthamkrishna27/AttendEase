import { prisma } from './db/prisma.js';

async function main() {
  console.log('=== STARTING DATABASE CLEANUP ===');

  const actions = await prisma.requestAction.deleteMany();
  console.log(`Deleted ${actions.count} RequestAction records.`);

  const reqFac = await prisma.requestFaculty.deleteMany();
  console.log(`Deleted ${reqFac.count} RequestFaculty records.`);

  const notifs = await prisma.notification.deleteMany();
  console.log(`Deleted ${notifs.count} Notification records.`);

  const requests = await prisma.request.deleteMany();
  console.log(`Deleted ${requests.count} Request records.`);

  const passkeys = await prisma.userPasskey.deleteMany();
  console.log(`Deleted ${passkeys.count} UserPasskey records.`);

  const records = await prisma.attendanceRecord.deleteMany();
  console.log(`Deleted ${records.count} AttendanceRecord items.`);

  const submissions = await prisma.attendanceSubmission.deleteMany();
  console.log(`Deleted ${submissions.count} AttendanceSubmission items.`);

  console.log('=== DATABASE CLEANUP COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((err) => {
    console.error('Database cleanup error:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
