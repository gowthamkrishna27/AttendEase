import { prisma } from './prisma.js';

async function cleanDatabase() {
  console.log('🧹 Cleaning test requests, actions, notifications, and registered passkeys from database...');

  const actions = await prisma.requestAction.deleteMany({});
  console.log(`  - Deleted ${actions.count} request actions`);

  const facs = await prisma.requestFaculty.deleteMany({});
  console.log(`  - Deleted ${facs.count} request faculty assignments`);

  const notifs = await prisma.notification.deleteMany({});
  console.log(`  - Deleted ${notifs.count} notifications`);

  const reqs = await prisma.request.deleteMany({});
  console.log(`  - Deleted ${reqs.count} requests`);

  const passkeys = await prisma.userPasskey.deleteMany({});
  console.log(`  - Deleted ${passkeys.count} registered passkeys`);

  console.log('✨ Database clean complete! All test requests and passkeys cleared.');
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error cleaning database:', err);
    process.exit(1);
  });
