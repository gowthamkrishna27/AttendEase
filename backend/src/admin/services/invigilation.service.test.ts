import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../db/prisma.js';
import {
  createDuty,
  listDuties,
  getDutyById,
  updateDuty,
  deleteDuty,
  InvalidFacultyError,
  DuplicateFacultyAssignmentError,
  DutyNotFoundError,
} from './invigilation.service.js';

// Helper: returns a YYYY-MM-DD date string N days from today in IST
function istDatePlus(days: number): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const base = new Date(now.getTime() + days * 86400000);
  return formatter.format(base); // YYYY-MM-DD
}

describe('Admin Invigilation Management Service Tests', () => {
  let faculty1: { id: string; userId: string; department: string };
  let faculty2: { id: string; userId: string; department: string };
  let nonFacultyUser: { id: string; userId: string };
  let createdDutyId: string;

  before(async () => {
    // Find or create test faculty users
    let f1 = await prisma.user.findFirst({ where: { role: 'faculty', department: 'CSIT' } });
    if (!f1) {
      f1 = await prisma.user.findFirst({ where: { role: 'faculty' } });
    }
    if (!f1) {
      f1 = await prisma.user.create({
        data: {
          userId: 'test-fac-invig-1',
          name: 'Test Faculty 1',
          email: 'testfac1@college.edu',
          role: 'faculty',
          department: 'CSIT',
          password: 'password123',
        },
      });
    }
    faculty1 = { id: f1.id, userId: f1.userId, department: f1.department };

    let f2 = await prisma.user.findFirst({
      where: { role: 'faculty', id: { not: f1.id } },
    });
    if (!f2) {
      f2 = await prisma.user.create({
        data: {
          userId: 'test-fac-invig-2',
          name: 'Test Faculty 2',
          email: 'testfac2@college.edu',
          role: 'faculty',
          department: 'CSD',
          password: 'password123',
        },
      });
    }
    faculty2 = { id: f2.id, userId: f2.userId, department: f2.department };

    // Find or create a non-faculty user (student or admin)
    let nonFac = await prisma.user.findFirst({ where: { role: 'student' } });
    if (!nonFac) {
      nonFac = await prisma.user.create({
        data: {
          userId: 'test-stu-invig-1',
          name: 'Test Student 1',
          email: 'teststudent1@college.edu',
          role: 'student',
          department: 'CSIT',
          password: 'password123',
          rollNumber: 'TEST999',
        },
      });
    }
    nonFacultyUser = { id: nonFac.id, userId: nonFac.userId };
  });

  it('1. Successfully creates an invigilation duty with multiple faculty assignments', async () => {
    const duty = await createDuty({
      examType: 'MID',
      date: istDatePlus(1),    // Tomorrow
      session: 'MORNING',
      startTime: '09:30',
      endTime: '12:30',
      assignedFaculty: [
        { facultyId: faculty1.id },
        { facultyId: faculty2.userId }, // Test lookup by userId
      ],
    });

    assert.ok(duty.id, 'Duty should have an ID');
    assert.equal(duty.examType, 'MID');
    assert.equal(duty.session, 'MORNING');
    assert.equal(duty.assignedFaculty.length, 2, 'Should have 2 assigned faculty');

    createdDutyId = duty.id;
  });

  it('2. Rejects creation with duplicate faculty assignments', async () => {
    await assert.rejects(
      async () => {
        await createDuty({
          examType: 'SEM',
          date: istDatePlus(2),
          session: 'AFTERNOON',
          assignedFaculty: [
            { facultyId: faculty1.id },
            { facultyId: faculty1.id },
          ],
        });
      },
      (err: any) => err instanceof DuplicateFacultyAssignmentError,
    );
  });

  it('3. Rejects assigning a non-faculty user', async () => {
    await assert.rejects(
      async () => {
        await createDuty({
          examType: 'LAB',
          date: istDatePlus(1),
          session: 'MORNING',
          assignedFaculty: [
            { facultyId: nonFacultyUser.id },
          ],
        });
      },
      (err: any) => err instanceof InvalidFacultyError,
    );
  });

  it('4. Retrieves duties for administrators with filtering', async () => {
    const resAll = await listDuties({});
    assert.ok(Array.isArray(resAll.duties));
    assert.ok(resAll.total >= 1);

    // Filter by examType
    const resMid = await listDuties({ examType: 'MID' });
    assert.ok(resMid.duties.every((d) => d.examType === 'MID'));

    // Filter by faculty
    const resFac = await listDuties({ facultyId: faculty1.id });
    assert.ok(resFac.duties.some((d) => d.id === createdDutyId));

    // Filter by department (through InvigilationAssignment -> User.department)
    const resDept = await listDuties({ department: faculty1.department });
    assert.ok(resDept.duties.some((d) => d.id === createdDutyId));

    // Filter by session
    const resMorning = await listDuties({ session: 'MORNING' });
    assert.ok(resMorning.duties.every((d) => d.session === 'MORNING'));
  });

  it('5. Updates duty information and reassigns faculty', async () => {
    const updated = await updateDuty(createdDutyId, {
      date: istDatePlus(3),
      session: 'AFTERNOON',
      startTime: '14:00',
      endTime: '17:00',
      assignedFaculty: [
        { facultyId: faculty2.id },
      ],
    });

    assert.equal(updated.session, 'AFTERNOON');
    assert.equal(updated.startTime, '14:00');
    assert.equal(updated.assignedFaculty.length, 1);
    assert.equal(updated.assignedFaculty[0]?.facultyId, faculty2.id);
  });

  it('6. Clears optional times by setting to null', async () => {
    const updated = await updateDuty(createdDutyId, {
      startTime: null,
      endTime: null,
    });

    assert.equal(updated.startTime, null);
    assert.equal(updated.endTime, null);
  });

  it('7. Deletes invigilation duty without deleting User records', async () => {
    const deleteRes = await deleteDuty(createdDutyId);
    assert.equal(deleteRes.success, true);

    // Verify duty is deleted
    await assert.rejects(
      async () => {
        await getDutyById(createdDutyId);
      },
      (err: any) => err instanceof DutyNotFoundError,
    );

    // Verify faculty User records still exist safely
    const fCheck1 = await prisma.user.findUnique({ where: { id: faculty1.id } });
    const fCheck2 = await prisma.user.findUnique({ where: { id: faculty2.id } });
    assert.ok(fCheck1, 'Faculty 1 user record must still exist');
    assert.ok(fCheck2, 'Faculty 2 user record must still exist');
  });
});
