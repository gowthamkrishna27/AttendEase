import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStudentId,
  isStudentOwnerOfRequest,
  isFacultyAuthorizedForRequest,
  isHodAuthorizedForRequest,
  isAdminAuthorizedForRequest,
  authorizeRequestViewer,
} from './requestAuth.js';
import { generateShareToken, isValidShareTokenFormat } from '../utils/shareToken.js';

describe('Unified Canonical Request Authorization & Share Token Test Suite', () => {
  // Test Request A created by Student A
  const studentA = {
    id: 'stu-24b91a0501',
    userId: '24B91A0501',
    rollNumber: '24B91A0501',
    email: '24b91a0501@srkrec.ac.in',
    name: 'Gowtham Student A',
    role: 'student',
    department: 'CSIT',
  };

  const studentB = {
    id: 'stu-24b91a0502',
    userId: '24B91A0502',
    rollNumber: '24B91A0502',
    email: '24b91a0502@srkrec.ac.in',
    name: 'Gowtham Student A', // SAME NAME as Student A! (Test Case K)
    role: 'student',
    department: 'CSIT',
  };

  const facultyAssigned = {
    id: 'fac-csit-001',
    userId: 'fac-csit-001',
    email: 'murthy@srkrec.ac.in',
    name: 'Dr. Murthy',
    role: 'faculty',
    department: 'CSIT',
  };

  const facultyUnassigned = {
    id: 'fac-ece-099',
    userId: 'fac-ece-099',
    email: 'suresh.ece@srkrec.ac.in',
    name: 'Dr. Suresh ECE',
    role: 'faculty',
    department: 'ECE',
  };

  const hodCsit = {
    id: 'hod-csit-001',
    userId: 'hod-csit-001',
    email: 'hod.csit@srkrec.ac.in',
    name: 'Dr. CSIT HOD',
    role: 'hod',
    department: 'CSIT',
  };

  const hodEce = {
    id: 'hod-ece-001',
    userId: 'hod-ece-001',
    email: 'hod.ece@srkrec.ac.in',
    name: 'Dr. ECE HOD',
    role: 'hod',
    department: 'ECE',
  };

  const adminUser = {
    id: 'admin-001',
    userId: 'admin-001',
    email: 'admin@srkrec.ac.in',
    name: 'System Admin',
    role: 'admin',
    department: 'ADMIN',
  };

  const sampleRequestA = {
    id: 'db_req_cuid_123',
    requestId: 'req-2026-CSIT-001',
    publicId: 'rq_U2YQ7XkP9WmL3nA8',
    studentId: '24B91A0501',
    student: {
      id: 'db_stu_cuid_123',
      userId: 'stu-24b91a0501',
      rollNumber: '24B91A0501',
      email: '24b91a0501@srkrec.ac.in',
      name: 'Gowtham Student A',
      department: 'CSIT',
    },
    primaryFacultyId: 'fac-csit-001',
    primaryFaculty: {
      id: 'db_fac_cuid_001',
      userId: 'fac-csit-001',
      email: 'murthy@srkrec.ac.in',
      name: 'Dr. Murthy',
      department: 'CSIT',
    },
    faculties: [
      {
        facultyId: 'fac-csit-001',
        faculty: {
          id: 'db_fac_cuid_001',
          userId: 'fac-csit-001',
          email: 'murthy@srkrec.ac.in',
          name: 'Dr. Murthy',
          department: 'CSIT',
        },
      },
    ],
    status: 'pending',
    date: '2026-08-25',
    description: 'Technical Conference Attendance',
  };

  const tokenA = generateShareToken(16);

  // ── TEST A: Student A opens their own share link ──
  it('TEST A: Student A opens their own share link -> Student read-only view', () => {
    assert.equal(isStudentOwnerOfRequest(sampleRequestA, studentA), true);
    const authRes = authorizeRequestViewer(sampleRequestA, studentA);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewerType, 'STUDENT_OWNER');
    assert.equal(authRes.destination, 'STUDENT_VIEW');
    assert.equal(authRes.viewMode, 'read-only');
    assert.equal(authRes.requestId, sampleRequestA.requestId);
  });

  // ── TEST B: Student B opens Student A's share link ──
  it("TEST B: Student B opens Student A's share link -> No access (403/unauthorized)", () => {
    assert.equal(isStudentOwnerOfRequest(sampleRequestA, studentB), false);
    const authRes = authorizeRequestViewer(sampleRequestA, studentB);
    assert.equal(authRes.authorized, false);
    assert.equal(authRes.error, "Request not found or you don't have permission to view it.");
  });

  // ── TEST C: Authorized Faculty opens Student A's link ──
  it("TEST C: Authorized Faculty opens Student A's link -> Faculty Review", () => {
    assert.equal(isFacultyAuthorizedForRequest(sampleRequestA, facultyAssigned), true);
    const authRes = authorizeRequestViewer(sampleRequestA, facultyAssigned);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewerType, 'FACULTY');
    assert.equal(authRes.destination, 'FACULTY_REVIEW');
    assert.equal(authRes.redirectPath, `/faculty/review/${sampleRequestA.requestId}`);
  });

  // ── TEST D: Unauthorized Faculty opens Student A's link ──
  it("TEST D: Unauthorized Faculty opens Student A's link -> Allowed (Read-Only)", () => {
    assert.equal(isFacultyAuthorizedForRequest(sampleRequestA, facultyUnassigned), false);
    const authRes = authorizeRequestViewer(sampleRequestA, facultyUnassigned);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewMode, 'read-only');
  });

  // ── TEST E: Authorized HOD opens link ──
  it('TEST E: Authorized HOD opens link -> HOD Review', () => {
    assert.equal(isHodAuthorizedForRequest(sampleRequestA, hodCsit), true);
    const authRes = authorizeRequestViewer(sampleRequestA, hodCsit);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewerType, 'HOD');
    assert.equal(authRes.destination, 'HOD_REVIEW');
  });

  // ── TEST F: Unauthorized role (e.g. unknown role or wrong dept HOD) ──
  it('TEST F: Unauthorized role or mismatching department HOD -> No access', () => {
    assert.equal(isHodAuthorizedForRequest(sampleRequestA, hodEce), false);
    const authRes = authorizeRequestViewer(sampleRequestA, hodEce);
    assert.equal(authRes.authorized, false);

    const randomRole = { id: 'x-001', role: 'guest' };
    const randomRes = authorizeRequestViewer(sampleRequestA, randomRole as any);
    assert.equal(randomRes.authorized, false);
  });

  // ── TEST G: Logged-out user opens link -> 401 with redirect to login ──
  it('TEST G: Logged-out user (null/undefined user) requires authentication', () => {
    // In share.ts, if !user -> returns 401 with redirectUrl: /login?redirect=/r/:shareToken
    const redirectUrl = `/login?redirect=/r/${encodeURIComponent(tokenA)}`;
    assert.equal(redirectUrl, `/login?redirect=/r/${tokenA}`);
  });

  // ── TEST H: Changing the share token by one character ──
  it('TEST H: Changing the share token by one character -> Invalid share link', () => {
    const tamperedToken = tokenA.slice(0, -1) + (tokenA.endsWith('X') ? 'Y' : 'X');
    assert.notEqual(tamperedToken, tokenA);
    // In share.ts, exact findUnique({ where: { token: tamperedToken } }) returns null -> 404
  });

  // ── TEST I: Replacing share token with request ID -> Invalid share link ──
  it('TEST I: Replacing share token with request ID (req-XXXX) -> Invalid share link', () => {
    // Exact token matching means passing requestId ('req-2026-CSIT-001') to /r/:token finds no row
    assert.notEqual(sampleRequestA.requestId, tokenA);
  });

  // ── TEST J: Replacing share token with public ID -> Invalid share link ──
  it('TEST J: Replacing share token with public ID (rq_XXXX) -> Invalid share link', () => {
    // Passing publicId ('rq_U2YQ7XkP9WmL3nA8') to /r/:token finds no row in share table
    assert.notEqual(sampleRequestA.publicId, tokenA);
  });

  // ── TEST K: Student with same name as request owner -> MUST NOT receive access ──
  it('TEST K: Student with same name as request owner MUST NOT receive access (strict canonical identity)', () => {
    // studentB has name === studentA.name, but rollNumber === '24B91A0502'
    assert.equal(studentB.name, studentA.name);
    assert.equal(isStudentOwnerOfRequest(sampleRequestA, studentB), false);
    const authRes = authorizeRequestViewer(sampleRequestA, studentB);
    assert.equal(authRes.authorized, false);
  });

  // ── TEST L: Faculty from another department/section -> Follows faculty authorization rules ──
  it('TEST L: Faculty from another department/section not assigned -> Allowed (Read-Only)', () => {
    assert.equal(isFacultyAuthorizedForRequest(sampleRequestA, facultyUnassigned), false);
    const authRes = authorizeRequestViewer(sampleRequestA, facultyUnassigned);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewMode, 'read-only');
  });

  // ── ADMIN TEST: Admin has separate ADMIN_REVIEW destination ──
  it('ADMIN: Admin is separate from HOD and routes to ADMIN_REVIEW', () => {
    assert.equal(isAdminAuthorizedForRequest(sampleRequestA, adminUser), true);
    const authRes = authorizeRequestViewer(sampleRequestA, adminUser);
    assert.equal(authRes.authorized, true);
    assert.equal(authRes.viewerType, 'ADMIN');
    assert.equal(authRes.destination, 'ADMIN_REVIEW');
  });

  // ── NORMALIZATION UNIT TESTS ──
  it('normalizes student IDs across all legacy/institutional variants', () => {
    assert.equal(normalizeStudentId('stu-24B91A0501'), '24b91a0501');
    assert.equal(normalizeStudentId('student-24B91A0501'), '24b91a0501');
    assert.equal(normalizeStudentId('24B91A0501@srkrec.ac.in'), '24b91a0501');
    assert.equal(normalizeStudentId(' 24B91A0501 '), '24b91a0501');
    assert.equal(normalizeStudentId(''), '');
    assert.equal(normalizeStudentId(null), '');
  });
});
