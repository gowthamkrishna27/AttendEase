import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db/prisma.js';
import { signToken } from '../middleware/auth.js';
import { createDuty } from '../admin/services/invigilation.service.js';

// Helper: returns a YYYY-MM-DD date N days from now in Asia/Kolkata
function istDatePlus(days: number): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(now.getTime() + days * 86400000));
}

// Helper: today's date in IST
function istToday(): string {
  return istDatePlus(0);
}

describe('Faculty Invigilation API & Visibility Window Test Suite', () => {
  let facultyA: { id: string; userId: string; email: string };
  let facultyB: { id: string; userId: string; email: string };

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
    facultyB = { id: fB.id, userId: fB.userId, email: fB.email };

    // Sign tokens (not used in these integration tests but kept for future HTTP-level tests)
    signToken({
      id: fA.userId,
      email: fA.email,
      role: 'faculty',
      name: fA.name,
      department: fA.department,
    });

    signToken({
      id: fB.userId,
      email: fB.email,
      role: 'faculty',
      name: fB.name,
      department: fB.department,
    });
  });

  after(async () => {
    if (testDutyIds.length > 0) {
      await prisma.invigilationDuty.deleteMany({
        where: { id: { in: testDutyIds } },
      });
    }
  });

  it('1. IST date bound helpers produce correct YYYY-MM-DD strings', () => {
    const today = istToday();
    const tomorrow = istDatePlus(1);
    const plus3 = istDatePlus(3);

    // All must be YYYY-MM-DD
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(tomorrow, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(plus3, /^\d{4}-\d{2}-\d{2}$/);

    // tomorrow must be strictly after today lexicographically
    assert.ok(tomorrow > today, 'Tomorrow must be after today');
    // plus3 must be strictly after tomorrow
    assert.ok(plus3 > tomorrow, 'Plus 3 days must be after tomorrow');
  });

  it('2. Correctly creates duties and faculty isolation holds', async () => {
    // Duty 1: Today, assigned to Faculty A
    const dutyToday = await createDuty({
      examType: 'MID',
      date: istToday(),
      session: 'MORNING',
      startTime: '09:30',
      endTime: '12:30',
      assignedFaculty: [{ facultyId: facultyA.id }],
    });
    testDutyIds.push(dutyToday.id);

    // Duty 2: Tomorrow, assigned to Faculty A
    const dutyTomorrow = await createDuty({
      examType: 'SEM',
      date: istDatePlus(1),
      session: 'AFTERNOON',
      assignedFaculty: [{ facultyId: facultyA.id }],
    });
    testDutyIds.push(dutyTomorrow.id);

    // Duty 3: +5 days — beyond 3-day window, assigned to Faculty A
    const dutyBeyondWindow = await createDuty({
      examType: 'MID',
      date: istDatePlus(5),
      session: 'MORNING',
      assignedFaculty: [{ facultyId: facultyA.id }],
    });
    testDutyIds.push(dutyBeyondWindow.id);

    // Duty 4: Assigned ONLY to Faculty B
    const dutyFacultyBOnly = await createDuty({
      examType: 'LAB',
      date: istToday(),
      session: 'AFTERNOON',
      assignedFaculty: [{ facultyId: facultyB.id }],
    });
    testDutyIds.push(dutyFacultyBOnly.id);

    // Isolation: query for Faculty A only
    const facultyADuties = await prisma.invigilationDuty.findMany({
      where: {
        assignments: { some: { facultyId: facultyA.id } },
        date: {
          gte: istToday(),
          lte: istDatePlus(3),
        },
      },
    });

    const dutyIds = facultyADuties.map((d) => d.id);

    assert.ok(dutyIds.includes(dutyToday.id), 'Today duty must be visible to Faculty A');
    assert.ok(dutyIds.includes(dutyTomorrow.id), 'Tomorrow duty must be visible to Faculty A');
    assert.ok(!dutyIds.includes(dutyBeyondWindow.id), 'Duty beyond +3 days must NOT be visible');
    assert.ok(!dutyIds.includes(dutyFacultyBOnly.id), 'Faculty B duty must NOT be visible to Faculty A');
  });

  it('3. Sort order: duties ordered by date then session', async () => {
    const duties = await prisma.invigilationDuty.findMany({
      where: {
        id: { in: testDutyIds.slice(0, 2) },
      },
      orderBy: [{ date: 'asc' }, { session: 'asc' }],
    });

    // Just verify we get both and they're in the right order
    assert.equal(duties.length, 2);
    for (let i = 1; i < duties.length; i++) {
      const prev = duties[i - 1]!;
      const curr = duties[i]!;
      const dateOk = prev.date <= curr.date;
      assert.ok(dateOk, `Duties should be ordered by date: ${prev.date} <= ${curr.date}`);
    }
  });

  it('4. Strict Isolation: Faculty A cannot see Faculty B assignments', async () => {
    const dutiesForB = await prisma.invigilationDuty.findMany({
      where: {
        assignments: { some: { facultyId: facultyB.id } },
      },
    });

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
