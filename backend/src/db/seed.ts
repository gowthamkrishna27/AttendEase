/**
 * Seeds the PostgreSQL database with initial data including CSD & CSIT students (24B91A0701 → 24B91A07D1),
 * CSD/CSIT faculty, and HOD accounts.
 */

import { prisma } from './prisma.js';
import type { Role, Prisma } from '@prisma/client';

// ── Students (24B91A0701 → 24B91A07D1) ───────────────────────────────────────
const numericSuffixes = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'));
const aSeries = Array.from({ length: 10 }, (_, i) => `A${i}`);
const bSeries = Array.from({ length: 10 }, (_, i) => `B${i}`);
const cSeries = Array.from({ length: 10 }, (_, i) => `C${i}`);
const dSeries = ['D0', 'D1'];

const allRollSuffixes = [...numericSuffixes, ...aSeries, ...bSeries, ...cSeries, ...dSeries];

const allStudents = allRollSuffixes.map((suffix) => {
  const rollNumber = `24B91A07${suffix}`;
  const department = 'CSIT';
  const name = `CSIT Student ${suffix}`;
  return {
    userId:     `stu-${rollNumber}`,
    name,
    email:      `${rollNumber.toLowerCase()}@college.edu`,
    role:       'student' as Role,
    department,
    rollNumber,
    semester:   6,
    password:   rollNumber,
    avatarUrl:  `https://srkrexams.in/SRKR/photo/${rollNumber}.jpg`,
  };
});

// ── CSD Faculty ────────────────────────────────────────────────────────────────
const CSD_FACULTY = [
  { userId: 'fac-csd-001', name: 'Dr. Suresh Babu Mudunuri', email: 'suresh.mudunuri@srkrec.ac.in', designation: 'Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg' },
  { userId: 'fac-csd-002', name: 'A. Aswini Priyanka', email: 'aapriyanka@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg' },
  { userId: 'fac-csd-003', name: 'S. Mohan Krishna', email: 'mohanakrishna.seerla@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1376.jpeg' },
  { userId: 'fac-csd-004', name: 'P S V Surya Kumar', email: 'psvsuryakumar@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1382.jpg' },
  { userId: 'fac-csd-005', name: 'Angara Satyam', email: 'asatyam@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1472.jpg' },
  { userId: 'fac-csd-006', name: 'Dr. K. Srinivasa Rao', email: 'ksrinivasarao@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1474.jpg' },
  { userId: 'fac-csd-007', name: 'K. Bhanu Rajesh Naidu', email: 'kbrnaidu@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1479.jpg' },
  { userId: 'fac-csd-008', name: 'N. Aneela', email: 'aneela@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1483.jpg' },
  { userId: 'fac-csd-009', name: 'M Sai Madhuri', email: 'madhuryamudundi@gmail.com', designation: 'Teaching Assistant', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1504.jpeg' },
].map(f => ({ ...f, role: 'faculty' as Role, department: 'CSD', password: '1234' }));

// ── CSIT Faculty ───────────────────────────────────────────────────────────────
const CSIT_FACULTY = [
  { userId: 'fac-csit-001', name: 'Dr. NGK Murthy', email: 'gopinukala@gmail.com', designation: 'Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg' },
  { userId: 'fac-csit-002', name: 'N. Navya', email: 'navyanallaparaju@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg' },
  { userId: 'fac-csit-003', name: 'Neti Praveen', email: 'npraveen@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1348.jpg' },
  { userId: 'fac-csit-004', name: 'K V Sunil Varma', email: 'kvsunilvarma@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1372.jpg' },
  { userId: 'fac-csit-005', name: 'P Mouna', email: 'mouna.p@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1398.jpeg' },
  { userId: 'fac-csit-006', name: 'P Manoj', email: 'manoj.p@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1399.jpeg' },
  { userId: 'fac-csit-007', name: 'Anusuri Krishna Veni', email: 'akveni@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1478.jpg' },
  { userId: 'fac-csit-008', name: 'K V V Satya Trinadh Naidu', email: 'kvvstnaidu@srkrec.ac.in', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1480.jpg' },
  { userId: 'fac-csit-009', name: 'D Parvathi', email: 'parvathiram21@gmail.com', designation: 'Assistant Professor', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1503.jpeg' },
  { userId: 'fac-csit-010', name: 'K Sri Vigyna', email: 'vignyak@gmail.com', designation: 'Teaching Assistant', avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1509.jpeg' },
].map(f => ({ ...f, role: 'faculty' as Role, department: 'CSIT', password: '1234' }));

// ── HOD Accounts ───────────────────────────────────────────────────────────────
const HOD_USERS = [
  {
    userId: 'hod-csd', name: 'Dr. Suresh Babu Mudunuri',
    email: 'hod.csd@srkrec.ac.in', role: 'hod' as Role,
    department: 'CSD', password: '1234',
    avatarUrl: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg',
  },
  {
    userId: 'hod-csit', name: 'Dr. NGK Murthy',
    email: 'hod.csit@srkrec.ac.in', role: 'hod' as Role,
    department: 'CSIT', password: '1234',
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
    password: '1234',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  },
];

const ALL_USERS = [...allStudents, ...CSD_FACULTY, ...CSIT_FACULTY, ...HOD_USERS, ...ADMIN_USERS];

const SAMPLE_REQUESTS = [
  {
    requestId:        'req-csd-001',
    studentId:        'stu-24B91A0701',
    primaryFacultyId: 'fac-csd-002',
    reason:           'internship' as const,
    reasonLabel:      'Internship',
    date:             '2026-07-25',
    startTime:        '09:00',
    endTime:          '16:00',
    description:      'Attending web development internship orientation session at Tech Park.',
    status:           'pending' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    requestId:        'req-csd-002',
    studentId:        'stu-24B91A0702',
    primaryFacultyId: 'fac-csd-003',
    reason:           'medical' as const,
    reasonLabel:      'Medical Leave',
    date:             '2026-07-24',
    startTime:        '10:00',
    endTime:          '13:00',
    description:      'Hospital visit for medical checkup and treatment.',
    status:           'approved' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    requestId:        'req-csd-003',
    studentId:        'stu-24B91A0703',
    primaryFacultyId: 'fac-csd-004',
    reason:           'sports' as const,
    reasonLabel:      'Sports Event',
    date:             '2026-07-26',
    startTime:        '08:00',
    endTime:          '17:00',
    description:      'Representing college in Inter-College Badminton Tournament.',
    status:           'pending' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    requestId:        'req-csd-004',
    studentId:        'stu-24B91A0704',
    primaryFacultyId: 'fac-csd-005',
    reason:           'competition' as const,
    reasonLabel:      'Competition',
    date:             '2026-07-22',
    startTime:        '09:00',
    endTime:          '18:00',
    description:      'Participating in Smart India Hackathon zonal round.',
    status:           'approved' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    requestId:        'req-csit-001',
    studentId:        'stu-24B91A0766',
    primaryFacultyId: 'fac-csit-002',
    reason:           'internship' as const,
    reasonLabel:      'Internship',
    date:             '2026-07-25',
    startTime:        '09:00',
    endTime:          '17:00',
    description:      'Attending cloud computing workshop.',
    status:           'pending' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    requestId:        'req-csit-002',
    studentId:        'stu-24B91A0767',
    primaryFacultyId: 'fac-csit-003',
    reason:           'medical' as const,
    reasonLabel:      'Medical Leave',
    date:             '2026-07-23',
    startTime:        '09:00',
    endTime:          '12:00',
    description:      'Fever and medical consultation.',
    status:           'approved' as const,
    submittedAt:      new Date(Date.now() - 3600000 * 30).toISOString(),
  },
];

export async function seedDatabase(): Promise<void> {
  console.log('🌱  Seeding/Updating PostgreSQL with CSIT & CSD students, faculty and HODs...');

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

  // Seed initial users without overriding custom admin updates to department

  for (const req of SAMPLE_REQUESTS) {
    const existing = await prisma.request.findUnique({ where: { requestId: req.requestId } });
    if (!existing) {
      const created = await prisma.request.create({ data: req });
      if (req.primaryFacultyId) {
        await prisma.requestFaculty.create({
          data: { requestId: created.id, facultyId: req.primaryFacultyId },
        });
      }
      await prisma.requestAction.create({
        data: {
          requestId:     created.id,
          performedById: req.studentId,
          action:        'Submitted',
          remarks:       'Request submitted by student',
        },
      });
    }
  }

  console.log(`✅  Successfully seeded ${ALL_USERS.length} users.`);
}

// Auto-run if executed directly via CLI (e.g. npm run db:seed)
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => {
      console.log('Done seeding.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

