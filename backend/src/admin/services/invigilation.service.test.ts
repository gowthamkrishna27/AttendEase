import { describe, it, before, after } from 'node:test';
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
  InvalidDateTimeRangeError,
  DutyNotFoundError,
} from './invigilation.service.js';

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
    const start = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    const end   = new Date(Date.now() + 86400000 + 7200000).toISOString(); // +2 hours

    const duty = await createDuty({
      examType: 'MID',
      examName: 'MID-1 Examination',
      subjectName: 'Compiler Design',
      startDateTime: start,
      endDateTime: end,
      blockName: 'CS Block',
      roomNumber: 'LH-201',
      assignedFaculty: [
        { facultyId: faculty1.id, dutyType: 'Chief Invigilator' },
        { facultyId: faculty2.userId, dutyType: 'Room Invigilator' }, // Test lookup by userId
      ],
    });

    assert.ok(duty.id, 'Duty should have an ID');
    assert.equal(duty.examType, 'MID');
    assert.equal(duty.subjectName, 'Compiler Design');
    assert.equal(duty.assignedFaculty.length, 2, 'Should have 2 assigned faculty');
    
    createdDutyId = duty.id;
  });

  it('2. Rejects creation with duplicate faculty assignments', async () => {
    const start = new Date().toISOString();
    const end   = new Date(Date.now() + 3600000).toISOString();

    await assert.rejects(
      async () => {
        await createDuty({
          examType: 'SEM',
          examName: 'Semester End Exam',
          subjectName: 'Database Systems',
          startDateTime: start,
          endDateTime: end,
          blockName: 'Main Block',
          roomNumber: 'LH-101',
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
    const start = new Date().toISOString();
    const end   = new Date(Date.now() + 3600000).toISOString();

    await assert.rejects(
      async () => {
        await createDuty({
          examType: 'LAB',
          examName: 'Lab Exam',
          subjectName: 'Web Programming Lab',
          startDateTime: start,
          endDateTime: end,
          blockName: 'Lab Block',
          roomNumber: 'Lab-1',
          assignedFaculty: [
            { facultyId: nonFacultyUser.id },
          ],
        });
      },
      (err: any) => err instanceof InvalidFacultyError,
    );
  });

  it('4. Rejects invalid date time range (endDateTime <= startDateTime)', async () => {
    const now = new Date();
    const earlier = new Date(Date.now() - 3600000);

    await assert.rejects(
      async () => {
        await createDuty({
          examType: 'MID',
          examName: 'MID-2',
          subjectName: 'Operating Systems',
          startDateTime: now.toISOString(),
          endDateTime: earlier.toISOString(),
          blockName: 'CS Block',
          roomNumber: 'LH-202',
          assignedFaculty: [{ facultyId: faculty1.id }],
        });
      },
      (err: any) => err instanceof InvalidDateTimeRangeError,
    );
  });

  it('5. Retrieves duties for administrators with filtering', async () => {
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
  });

  it('6. Updates duty information and reassigns faculty', async () => {
    const updated = await updateDuty(createdDutyId, {
      examName: 'MID-1 Examination (Rescheduled)',
      roomNumber: 'LH-305',
      assignedFaculty: [
        { facultyId: faculty2.id, dutyType: 'Sole Invigilator' },
      ],
    });

    assert.equal(updated.examName, 'MID-1 Examination (Rescheduled)');
    assert.equal(updated.roomNumber, 'LH-305');
    assert.equal(updated.assignedFaculty.length, 1);
    assert.equal(updated.assignedFaculty[0]?.facultyId, faculty2.id);
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
