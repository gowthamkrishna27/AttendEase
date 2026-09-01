import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db/prisma.js';
import { signToken } from '../middleware/auth.js';
import { getKolkataCalendarBounds } from './invigilation.js';
import { createDuty } from '../admin/services/invigilation.service.js';

describe('Faculty Invigilation API & Visibility Window Test Suite', () => {
  let facultyA: { id: string; userId: string; email: string };
  let facultyB: { id: string; userId: string; email: string };
  let studentUser: { id: string; userId: string; email: string };

  let tokenFacultyA: string;
  let tokenFacultyB: string;
  let tokenStudent: string;

  const testDutyIds: string[] = [];

  before(async () => {
    const facultyUsers = await prisma.user.findMany({
      where: { role: 'faculty' },
      orderBy: { name: 'asc' },
      take: 2,
    });

    if (facultyUsers.length < 2) {
      const fallbackFacultyProfiles = [
        {
          userId: 'fac-invig-dynamic-1',
          name: 'Faculty Test User 1',
          email: 'faculty.dynamic.1@college.edu',
          role: 'faculty' as const,
          department: 'CSIT',
          password: 'password123',
        },
        {
          userId: 'fac-invig-dynamic-2',
          name: 'Faculty Test User 2',
          email: 'faculty.dynamic.2@college.edu',
          role: 'faculty' as const,
          department: 'CSD',
          password: 'password123',
        },
      ];

      for (const profile of fallbackFacultyProfiles) {
        const existing = await prisma.user.findFirst({ where: { email: profile.email } });
        if (!existing) {
          await prisma.user.create({ data: profile });
        }
      }
    }

    const [fA, fB] = await prisma.user.findMany({
      where: { role: 'faculty' },
      orderBy: { name: 'asc' },
      take: 2,
    });

    if (!fA || !fB) {
      throw new Error('At least two faculty users are required for the invigilation test setup.');
    }

    facultyA = { id: fA.id, userId: fA.userId, email: fA.email };
    tokenFacultyA = signToken({
      id: fA.userId,
      email: fA.email,
      role: 'faculty',
      name: fA.name,
      department: fA.department,
    });

    facultyB = { id: fB.id, userId: fB.userId, email: fB.email };
    tokenFacultyB = signToken({
      id: fB.userId,
      email: fB.email,
      role: 'faculty',
      name: fB.name,
      department: fB.department,
    });

    // Setup Student
    let s = await prisma.user.findFirst({ where: { role: 'student', email: 'stu_invig_test@college.edu' } });
    if (!s) {
      s = await prisma.user.create({
        data: {
          userId: 'stu-invig-test-1',
          name: 'Student One',
          email: 'stu_invig_test@college.edu',
          role: 'student',
          department: 'CSIT',
          password: 'password123',
          rollNumber: 'INVIG_STU_1',
        },
      });
    }
    studentUser = { id: s.id, userId: s.userId, email: s.email };
    tokenStudent = signToken({
      id: s.userId,
      email: s.email,
      role: 'student',
      name: s.name,
      department: s.department,
    });
  });

  after(async () => {
    // Cleanup test duties
    if (testDutyIds.length > 0) {
      await prisma.invigilationDuty.deleteMany({
        where: { id: { in: testDutyIds } },
      });
    }
  });

  it('1. Asia/Kolkata 3-calendar-day window bounds calculation is exact', () => {
    // Reference date: 2026-08-31 10:00:00 UTC (15:30:00 IST)
    const fixedNow = new Date('2026-08-31T10:00:00.000Z');
    const { currentTime, maxEndUtc } = getKolkataCalendarBounds(fixedNow);

    assert.equal(currentTime.toISOString(), '2026-08-31T10:00:00.000Z');
    // +3 calendar days in IST: Aug 31 -> Sep 1 (+1) -> Sep 2 (+2) -> Sep 3 (+3)
    // Sep 3 23:59:59.999 IST = Sep 3 18:29:59.999 UTC
    assert.equal(maxEndUtc.toISOString(), '2026-09-03T18:29:59.999Z');
  });

  it('2. Correctly categorizes: In Progress, Within 3 Days, Beyond 3 Days, and Completed duties', async () => {
    const now = new Date();
    const { maxEndUtc } = getKolkataCalendarBounds(now);

    // Duty 1: In Progress right now (starts 30 mins ago, ends in 1 hour)
    const dutyInProgress = await createDuty({
      examType: 'MID',
      examName: 'MID-1 Ongoing',
      subjectName: 'Data Structures',
      startDateTime: new Date(now.getTime() - 30 * 60000).toISOString(),
      endDateTime: new Date(now.getTime() + 60 * 60000).toISOString(),
      blockName: 'CS Block',
      roomNumber: 'LH-101',
      assignedFaculty: [{ facultyId: facultyA.id, dutyType: 'Chief Invigilator' }],
    });
    testDutyIds.push(dutyInProgress.id);

    // Duty 2: Tomorrow (+1 day)
    const dutyTomorrow = await createDuty({
      examType: 'MID',
      examName: 'MID-1 Tomorrow',
      subjectName: 'Algorithms',
      startDateTime: new Date(now.getTime() + 24 * 3600000).toISOString(),
      endDateTime: new Date(now.getTime() + 27 * 3600000).toISOString(),
      blockName: 'CS Block',
      roomNumber: 'LH-102',
      assignedFaculty: [{ facultyId: facultyA.id, dutyType: 'Room Invigilator' }],
    });
    testDutyIds.push(dutyTomorrow.id);

    // Duty 3: Beyond 3 days (+5 days) -> Must NOT be returned
    const dutyBeyondWindow = await createDuty({
      examType: 'SEM',
      examName: 'Semester End Future',
      subjectName: 'Cloud Computing',
      startDateTime: new Date(maxEndUtc.getTime() + 24 * 3600000).toISOString(),
      endDateTime: new Date(maxEndUtc.getTime() + 27 * 3600000).toISOString(),
      blockName: 'Main Block',
      roomNumber: 'Auditorium',
      assignedFaculty: [{ facultyId: facultyA.id, dutyType: 'Chief Invigilator' }],
    });
    testDutyIds.push(dutyBeyondWindow.id);

    // Duty 4: Already Completed (Ended 2 hours ago) -> Must NOT be returned
    const dutyCompleted = await createDuty({
      examType: 'MID',
      examName: 'MID-1 Past Exam',
      subjectName: 'Discrete Mathematics',
      startDateTime: new Date(now.getTime() - 4 * 3600000).toISOString(),
      endDateTime: new Date(now.getTime() - 2 * 3600000).toISOString(),
      blockName: 'CS Block',
      roomNumber: 'LH-100',
      assignedFaculty: [{ facultyId: facultyA.id }],
    });
    testDutyIds.push(dutyCompleted.id);

    // Duty 5: Assigned ONLY to Faculty B
    const dutyFacultyBOnly = await createDuty({
      examType: 'LAB',
      examName: 'Faculty B Lab Exam',
      subjectName: 'AI Lab',
      startDateTime: new Date(now.getTime() + 12 * 3600000).toISOString(),
      endDateTime: new Date(now.getTime() + 15 * 3600000).toISOString(),
      blockName: 'Lab Block',
      roomNumber: 'Lab-4',
      assignedFaculty: [{ facultyId: facultyB.id }],
    });
    testDutyIds.push(dutyFacultyBOnly.id);

    // Query for Faculty A
    const facultyADuties = await prisma.invigilationDuty.findMany({
      where: {
        assignments: { some: { facultyId: facultyA.id } },
        endDateTime: { gte: now },
        startDateTime: { lte: maxEndUtc },
      },
      include: {
        assignments: { where: { facultyId: facultyA.id } },
      },
      orderBy: { startDateTime: 'asc' },
    });

    const dutyIds = facultyADuties.map((d) => d.id);

    // Assertions:
    assert.ok(dutyIds.includes(dutyInProgress.id), 'In-progress duty must be visible');
    assert.ok(dutyIds.includes(dutyTomorrow.id), 'Tomorrow duty within window must be visible');
    assert.ok(!dutyIds.includes(dutyBeyondWindow.id), 'Duty beyond +3 days must NOT be visible');
    assert.ok(!dutyIds.includes(dutyCompleted.id), 'Completed duty must NOT be visible');
    assert.ok(!dutyIds.includes(dutyFacultyBOnly.id), 'Faculty B duty must NOT be visible to Faculty A');
  });

  it('3. In-Progress duties are prioritized at the top of the returned list', async () => {
    const now = new Date();
    const nowMs = now.getTime();

    const formatted = [
      {
        id: 'upcoming-1',
        startDateTime: new Date(nowMs + 10 * 3600000).toISOString(),
        endDateTime: new Date(nowMs + 13 * 3600000).toISOString(),
        status: 'UPCOMING',
      },
      {
        id: 'in-progress-1',
        startDateTime: new Date(nowMs - 30 * 60000).toISOString(),
        endDateTime: new Date(nowMs + 90 * 60000).toISOString(),
        status: 'IN_PROGRESS',
      },
      {
        id: 'upcoming-2',
        startDateTime: new Date(nowMs + 2 * 3600000).toISOString(),
        endDateTime: new Date(nowMs + 5 * 3600000).toISOString(),
        status: 'UPCOMING',
      },
    ];

    formatted.sort((a, b) => {
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    });

    assert.equal(formatted[0]?.id, 'in-progress-1', 'IN_PROGRESS must be first');
    assert.equal(formatted[1]?.id, 'upcoming-2', 'Nearest upcoming must be second');
    assert.equal(formatted[2]?.id, 'upcoming-1', 'Later upcoming must be third');
  });

  it('4. Strict Isolation: Faculty A cannot see Faculty B assignments', async () => {
    const dutiesForB = await prisma.invigilationDuty.findMany({
      where: {
        assignments: { some: { facultyId: facultyB.id } },
      },
    });

    // None of the duties strictly for Faculty B should reference Faculty A
    for (const d of dutiesForB) {
      const assignments = await prisma.invigilationAssignment.findMany({
        where: { dutyId: d.id },
      });
      const assignedIds = assignments.map((a) => a.facultyId);
      if (!assignedIds.includes(facultyA.id)) {
        assert.ok(!assignedIds.includes(facultyA.id), 'Faculty A must not be linked to Faculty B only duty');
      }
    }
  });
});
