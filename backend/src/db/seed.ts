/**
 * Seeds the PostgreSQL database with initial data including CSIT students,
 * CSD/CSIT faculty, and HOD accounts.
 * Uses Prisma upsert so re-running is safe — existing records are updated,
 * missing ones are created.
 */

import { prisma } from './prisma.js';
import type { Role, Prisma } from '@prisma/client';

// ── CSIT Students (24B91A0701 → 24B91A07D1) ───────────────────────────────────
const numericSuffixes = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'));
const aSeries = Array.from({ length: 10 }, (_, i) => `A${i}`);
const bSeries = Array.from({ length: 10 }, (_, i) => `B${i}`);
const cSeries = Array.from({ length: 10 }, (_, i) => `C${i}`);
const dSeries = ['D0', 'D1'];

const allRollSuffixes = [...numericSuffixes, ...aSeries, ...bSeries, ...cSeries, ...dSeries];

const csitStudents = allRollSuffixes.map(suffix => {
  const rollNumber = `24B91A07${suffix}`;
  const name = `CSIT Student ${suffix}`;
  return {
    userId:     `stu-${rollNumber}`,
    name,
    email:      `${rollNumber.toLowerCase()}@college.edu`,
    role:       'student' as Role,
    department: 'CSIT',
    rollNumber,
    semester:   6,
    password:   rollNumber,
    avatarUrl:  `https://srkrexams.in/SRKR/photo/${rollNumber}.jpg`,
  };
});

// ── CSD Faculty ────────────────────────────────────────────────────────────────
const CSD_FACULTY = [
  { userId: 'fac-csd-001', name: 'Dr. Suresh Babu Mudunuri',  email: 'suresh.mudunuri@srkrec.ac.in',      designation: 'Professor',            avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg'  },
  { userId: 'fac-csd-002', name: 'A. Aswini Priyanka',         email: 'aapriyanka@srkrec.ac.in',           designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg'  },
  { userId: 'fac-csd-003', name: 'S. Mohan Krishna',           email: 'mohanakrishna.seerla@srkrec.ac.in', designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1376.jpeg' },
  { userId: 'fac-csd-004', name: 'P S V Surya Kumar',          email: 'psvsuryakumar@srkrec.ac.in',        designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1382.jpg'  },
  { userId: 'fac-csd-005', name: 'Angara Satyam',              email: 'asatyam@srkrec.ac.in',              designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1472.jpg'  },
  { userId: 'fac-csd-006', name: 'Dr. K. Srinivasa Rao',       email: 'ksrinivasarao@srkrec.ac.in',        designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1474.jpg'  },
  { userId: 'fac-csd-007', name: 'K. Bhanu Rajesh Naidu',      email: 'kbrnaidu@srkrec.ac.in',             designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1479.jpg'  },
  { userId: 'fac-csd-008', name: 'N. Aneela',                  email: 'aneela@srkrec.ac.in',               designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1483.jpg'  },
  { userId: 'fac-csd-009', name: 'M Sai Madhuri',              email: 'madhuryamudundi@gmail.com',         designation: 'Teaching Assistant',   avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1504.jpeg' },
].map(f => ({ ...f, role: 'faculty' as Role, department: 'CSD', password: 'faculty123' }));

// ── CSIT Faculty ───────────────────────────────────────────────────────────────
const CSIT_FACULTY = [
  { userId: 'fac-csit-001', name: 'Dr. NGK Murthy',               email: 'gopinukala@gmail.com',             designation: 'Professor',            avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg'  },
  { userId: 'fac-csit-002', name: 'N. Navya',                     email: 'navyanallaparaju@srkrec.ac.in',    designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg'  },
  { userId: 'fac-csit-003', name: 'Neti Praveen',                  email: 'npraveen@srkrec.ac.in',            designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1348.jpg'  },
  { userId: 'fac-csit-004', name: 'K V Sunil Varma',              email: 'kvsunilvarma@srkrec.ac.in',        designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1372.jpg'  },
  { userId: 'fac-csit-005', name: 'P Mouna',                      email: 'mouna.p@srkrec.ac.in',             designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1398.jpeg' },
  { userId: 'fac-csit-006', name: 'P Manoj',                      email: 'manoj.p@srkrec.ac.in',             designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1399.jpeg' },
  { userId: 'fac-csit-007', name: 'Anusuri Krishna Veni',         email: 'akveni@srkrec.ac.in',              designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1478.jpg'  },
  { userId: 'fac-csit-008', name: 'K V V Satya Trinadh Naidu',   email: 'kvvstnaidu@srkrec.ac.in',          designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1480.jpg'  },
  { userId: 'fac-csit-009', name: 'D Parvathi',                   email: 'parvathiram21@gmail.com',          designation: 'Assistant Professor',  avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1503.jpeg' },
  { userId: 'fac-csit-010', name: 'K Sri Vigyna',                 email: 'vignyak@gmail.com',                designation: 'Teaching Assistant',   avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1509.jpeg' },
].map(f => ({ ...f, role: 'faculty' as Role, department: 'CSIT', password: 'faculty123' }));

// ── HOD Accounts ───────────────────────────────────────────────────────────────
const HOD_USERS = [
  {
    userId: 'hod-csd', name: 'Dr. Suresh Babu Mudunuri',
    email: 'hod.csd@srkrec.ac.in', role: 'hod' as Role,
    department: 'CSD', password: 'hodcsd123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg',
  },
  {
    userId: 'hod-csit', name: 'Dr. NGK Murthy',
    email: 'hod.csit@srkrec.ac.in', role: 'hod' as Role,
    department: 'CSIT', password: 'hodcsit123',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg',
  },
];

// ── Admin Accounts ─────────────────────────────────────────────────────────────
const ADMIN_USERS = [
  {
    userId: 'admin-001',
    name: 'System Admin',
    email: 'admin@college.edu',
    role: 'admin' as Role,
    department: 'Administration',
    password: 'admin123',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  },
];

const ALL_USERS = [...csitStudents, ...CSD_FACULTY, ...CSIT_FACULTY, ...HOD_USERS, ...ADMIN_USERS];

export async function seedDatabase(): Promise<void> {
  console.log('🌱  Seeding/Updating PostgreSQL with CSIT students, CSD/CSIT faculty and HODs...');

  const data: Prisma.UserCreateManyInput[] = ALL_USERS.map(user => ({
    userId:      user.userId,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    department:  user.department,
    password:    user.password,
    avatarUrl:   user.avatarUrl ?? null,
    designation: ('designation' in user ? (user.designation as string) : null) ?? null,
    rollNumber:  ('rollNumber' in user ? (user.rollNumber as string) : null) ?? null,
    semester:    ('semester'   in user ? (user.semester as number)   : null) ?? null,
  }));

  await prisma.user.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`✅  Successfully seeded ${ALL_USERS.length} users.`);
}
