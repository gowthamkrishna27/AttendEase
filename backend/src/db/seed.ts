/**
 * Seeds the MongoDB database with initial data including CSIT students (24B91A0701 to 24B91A0799).
 * Uses bulkWrite upserts so existing records are updated and missing ones created seamlessly.
 */

import { UserModel } from '../models/User.js';
import { RequestModel } from '../models/Request.js';

// Generate CSIT students (24B91A0701 to 24B91A0799, 24B91A07A0-A9, B0-B9, C0-C9, D1)
const numericSuffixes = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'));
const aSeries = Array.from({ length: 10 }, (_, i) => `A${i}`);
const bSeries = Array.from({ length: 10 }, (_, i) => `B${i}`);
const cSeries = Array.from({ length: 10 }, (_, i) => `C${i}`);
const dSeries = ['D0', 'D1'];

const allRollSuffixes = [...numericSuffixes, ...aSeries, ...bSeries, ...cSeries, ...dSeries];

const csitStudents = allRollSuffixes.map(suffix => {
  const rollNumber = `24B91A07${suffix}`;
  const name = rollNumber === '24B91A0720' ? 'Arjun Sharma' : `CSIT Student ${suffix}`;
  return {
    userId: `stu-${rollNumber}`,
    name,
    email: `${rollNumber.toLowerCase()}@college.edu`,
    role: 'student' as const,
    department: 'CSIT',
    rollNumber,
    semester: 6,
    password: rollNumber, // Registered number as password
    avatarUrl: `https://srkrexams.in/SRKR/photo/${rollNumber}.jpg`,
  };
});

const STAFF_USERS = [
  {
    userId: 'fac-001',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@college.edu',
    role: 'faculty' as const,
    department: 'CSIT',
    password: 'faculty123',
  },
  {
    userId: 'hod-001',
    name: 'Prof. Suresh Menon',
    email: 'hod.cs@college.edu',
    role: 'hod' as const,
    department: 'CSIT',
    password: 'hod123',
  },
];

const ALL_USERS = [...csitStudents, ...STAFF_USERS];

const SEED_REQUESTS: any[] = [];

export async function seedDatabase(): Promise<void> {
  console.log('🌱  Seeding/Updating database with CSIT students and staff...');

  // Upsert all users
  const userOps = ALL_USERS.map(u => ({
    updateOne: {
      filter: { userId: u.userId },
      update: { $set: u },
      upsert: true,
    },
  }));
  await UserModel.bulkWrite(userOps);

  // Clear all demo requests so all user accounts start clean
  await RequestModel.deleteMany({});

  console.log(`✅  Successfully seeded ${ALL_USERS.length} users and reset demo request data.`);
}
