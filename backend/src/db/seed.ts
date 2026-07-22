/**
 * Seeds the MongoDB database with initial data including CSIT students (24B91A0701 to 24B91A0799).
 * Uses bulkWrite upserts so existing records are updated and missing ones created seamlessly.
 */

import { UserModel } from '../models/User.js';
import { RequestModel } from '../models/Request.js';

// Remove old dummy accounts that were replaced by real faculty/HOD data
const OLD_USER_IDS = ['fac-001', 'hod-001'];

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

// ── CSD Faculty (9 members) ────────────────────────────────────────────────────
const CSD_FACULTY = [
  {
    userId: 'fac-csd-001',
    name: 'Dr. Suresh Babu Mudunuri',
    email: 'suresh.mudunuri@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg',
  },
  {
    userId: 'fac-csd-002',
    name: 'A. Aswini Priyanka',
    email: 'aapriyanka@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg',
  },
  {
    userId: 'fac-csd-003',
    name: 'S. Mohan Krishna',
    email: 'mohanakrishna.seerla@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1376.jpeg',
  },
  {
    userId: 'fac-csd-004',
    name: 'P S V Surya Kumar',
    email: 'psvsuryakumar@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1382.jpg',
  },
  {
    userId: 'fac-csd-005',
    name: 'Angara Satyam',
    email: 'asatyam@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1472.jpg',
  },
  {
    userId: 'fac-csd-006',
    name: 'Dr. K. Srinivasa Rao',
    email: 'ksrinivasarao@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1474.jpg',
  },
  {
    userId: 'fac-csd-007',
    name: 'K. Bhanu Rajesh Naidu',
    email: 'kbrnaidu@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1479.jpg',
  },
  {
    userId: 'fac-csd-008',
    name: 'N. Aneela',
    email: 'aneela@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1483.jpg',
  },
  {
    userId: 'fac-csd-009',
    name: 'M Sai Madhuri',
    email: 'madhuryamudundi@gmail.com',
    role: 'faculty' as const,
    department: 'CSD',
    designation: 'Teaching Assistant',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1504.jpeg',
  },
];

// ── CSIT Faculty (10 members) ──────────────────────────────────────────────────
const CSIT_FACULTY = [
  {
    userId: 'fac-csit-001',
    name: 'Dr. NGK Murthy',
    email: 'gopinukala@gmail.com',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg',
  },
  {
    userId: 'fac-csit-002',
    name: 'N. Navya',
    email: 'navyanallaparaju@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg',
  },
  {
    userId: 'fac-csit-003',
    name: 'Neti Praveen',
    email: 'npraveen@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1348.jpg',
  },
  {
    userId: 'fac-csit-004',
    name: 'K V Sunil Varma',
    email: 'kvsunilvarma@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1372.jpg',
  },
  {
    userId: 'fac-csit-005',
    name: 'P Mouna',
    email: 'mouna.p@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1398.jpeg',
  },
  {
    userId: 'fac-csit-006',
    name: 'P Manoj',
    email: 'manoj.p@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1399.jpeg',
  },
  {
    userId: 'fac-csit-007',
    name: 'Anusuri Krishna Veni',
    email: 'akveni@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1478.jpg',
  },
  {
    userId: 'fac-csit-008',
    name: 'K V V Satya Trinadh Naidu',
    email: 'kvvstnaidu@srkrec.ac.in',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1480.jpg',
  },
  {
    userId: 'fac-csit-009',
    name: 'D Parvathi',
    email: 'parvathiram21@gmail.com',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Assistant Professor',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1503.jpeg',
  },
  {
    userId: 'fac-csit-010',
    name: 'K Sri Vigyna',
    email: 'vignyak@gmail.com',
    role: 'faculty' as const,
    department: 'CSIT',
    designation: 'Teaching Assistant',
    password: 'faculty123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1509.jpeg',
  },
];

// ── HOD Accounts ───────────────────────────────────────────────────────────────
const HOD_USERS = [
  {
    userId: 'hod-csd',
    name: 'Dr. Suresh Babu Mudunuri',
    email: 'hod.csd@srkrec.ac.in',
    role: 'hod' as const,
    department: 'CSD',
    password: 'hodcsd123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg',
  },
  {
    userId: 'hod-csit',
    name: 'Dr. NGK Murthy',
    email: 'hod.csit@srkrec.ac.in',
    role: 'hod' as const,
    department: 'CSIT',
    password: 'hodcsit123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg',
  },
];

const STAFF_USERS = [...CSD_FACULTY, ...CSIT_FACULTY, ...HOD_USERS];

const ALL_USERS = [...csitStudents, ...STAFF_USERS];

const SEED_REQUESTS: any[] = [];

export async function seedDatabase(): Promise<void> {
  console.log('🌱  Seeding/Updating database with CSIT students, CSD/CSIT faculty and HODs...');

  // Remove legacy dummy accounts
  await UserModel.deleteMany({ userId: { $in: OLD_USER_IDS } });

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

  console.log(`✅  Successfully seeded ${ALL_USERS.length} users (9 CSD faculty + 10 CSIT faculty + 2 HODs + ${ALL_USERS.length - 21} students).`);
}
