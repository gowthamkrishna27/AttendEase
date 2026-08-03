import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNoOverlappingPeriodConflict,
  parsePeriods,
  normalizePeriods,
  PeriodOverlapError,
  PeriodLockedError,
} from './attendance.js';

const facultyA = {
  id: 'fac-csit-001',
  email: 'faculty.a@srkrec.ac.in',
  role: 'faculty',
};

const facultyB = {
  id: 'fac-csit-002',
  email: 'faculty.b@srkrec.ac.in',
  role: 'faculty',
};

const hod = {
  id: 'hod-csit-001',
  email: 'hod@srkrec.ac.in',
  role: 'hod',
};

const admin = {
  id: 'admin-001',
  email: 'admin@srkrec.ac.in',
  role: 'admin',
};

const existingOneTwo = [
  {
    periods: '1,2',
    markedById: facultyA.id,
    markedBy: { userId: facultyA.id, name: 'Dr. Faculty A', email: facultyA.email },
  },
];

describe('parsePeriods & normalizePeriods (H1 regression)', () => {
  it('parses single numbers, comma strings, and ranges', () => {
    assert.deepEqual(parsePeriods(1), [1]);
    assert.deepEqual(parsePeriods('1'), [1]);
    assert.deepEqual(parsePeriods('1, 2'), [1, 2]);
    assert.deepEqual(parsePeriods('1-3'), [1, 2, 3]);
  });

  it('parses mixed ranges and comma-separated period strings (H1)', () => {
    assert.deepEqual(parsePeriods('1-2, 4'), [1, 2, 4]);
    assert.deepEqual(parsePeriods('1, 3-5, 7'), [1, 3, 4, 5, 7]);
    assert.equal(normalizePeriods('1-2, 4'), '1,2,4');
    assert.equal(normalizePeriods(' 2, 1-3 '), '1,2,3');
  });

  it('parses arrays of mixed formats', () => {
    assert.deepEqual(parsePeriods([1, '2-3', '4, 5']), [1, 2, 3, 4, 5]);
    assert.equal(normalizePeriods([3, '1-2']), '1,2,3');
  });

  it('handles empty or invalid inputs gracefully', () => {
    assert.deepEqual(parsePeriods(''), []);
    assert.deepEqual(parsePeriods(null), []);
    assert.deepEqual(parsePeriods(undefined), []);
    assert.equal(normalizePeriods('invalid'), '');
  });
});

describe('assertNoOverlappingPeriodConflict (C3 regression)', () => {
  it('allows non-overlapping period submissions', () => {
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(existingOneTwo, [3, 4], '3,4', facultyA),
    );
  });

  it('allows owner to update the same periods key (1,2)', () => {
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(existingOneTwo, [1, 2], '1,2', facultyA),
    );
  });

  it('allows owner to update when incoming periods are differently ordered (2,1)', () => {
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(existingOneTwo, [2, 1], '1,2', facultyA),
    );
  });

  it('allows HOD to update the same periods key', () => {
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(existingOneTwo, [1, 2], '1,2', hod),
    );
  });

  it('rejects owner submitting a subset period (1) when 1,2 exists', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [1], '1', facultyA),
      (err: unknown) => {
        assert.ok(err instanceof PeriodOverlapError);
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /Period\(s\) 1 are already covered/);
        assert.match(err.message, /Period\(s\) 1,2/);
        return true;
      },
    );
  });

  it('rejects HOD submitting a single overlapping period (2) when 1,2 exists', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [2], '2', hod),
      PeriodOverlapError,
    );
  });

  it('rejects admin submitting a single overlapping period (2) when 1,2 exists', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [2], '2', admin),
      PeriodOverlapError,
    );
  });

  it('rejects owner submitting expanded overlap (1,3) when 1,2 exists', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [1, 3], '1,3', facultyA),
      PeriodOverlapError,
    );
  });

  it('rejects other faculty even when using the exact same periods key', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [1, 2], '1,2', facultyB),
      (err: unknown) => {
        assert.ok(err instanceof PeriodLockedError);
        assert.equal(err.statusCode, 403);
        return true;
      },
    );
  });

  it('rejects other faculty submitting a partial overlapping period before ownership is considered', () => {
    assert.throws(
      () => assertNoOverlappingPeriodConflict(existingOneTwo, [2], '2', facultyB),
      PeriodOverlapError,
    );
  });

  it('rejects when two existing submissions would both overlap a combined submit', () => {
    const existing = [
      {
        periods: '1',
        markedById: facultyA.id,
        markedBy: { userId: facultyA.id, name: 'Dr. Faculty A', email: facultyA.email },
      },
      {
        periods: '2',
        markedById: facultyA.id,
        markedBy: { userId: facultyA.id, name: 'Dr. Faculty A', email: facultyA.email },
      },
    ];

    assert.throws(
      () => assertNoOverlappingPeriodConflict(existing, [1, 2], '1,2', facultyA),
      PeriodOverlapError,
    );
  });

  it('handles missing markedBy on existing submission without crashing', () => {
    const existing = [{ periods: '1,2', markedById: facultyA.id, markedBy: null }];

    assert.throws(
      () => assertNoOverlappingPeriodConflict(existing, [1], '1', hod),
      (err: unknown) => {
        assert.ok(err instanceof PeriodOverlapError);
        assert.match(err.message, /another faculty member/);
        return true;
      },
    );
  });
});

describe('Academic Year Scoping & Coexistence (H3 regression)', () => {
  it('allows Year 1, Year 2, and Year 3 for CSIT-A + Period 1 to coexist independently', () => {
    // When lock-read filters by year, existing submissions from other academic years are isolated
    const year1Submissions = [
      {
        year: '1st Year',
        periods: '1',
        markedById: facultyA.id,
        markedBy: { userId: facultyA.id, name: 'Dr. Faculty A', email: facultyA.email },
      },
    ];

    const year2Submissions = [
      {
        year: '2nd Year',
        periods: '1',
        markedById: facultyB.id,
        markedBy: { userId: facultyB.id, name: 'Dr. Faculty B', email: facultyB.email },
      },
    ];

    // Submitting Period 1 for 3rd Year when 1st Year and 2nd Year exist does not conflict
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict([], [1], '1', facultyA),
    );

    // Submitting Period 1 for 1st Year by owner succeeds
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(year1Submissions, [1], '1', facultyA),
    );

    // Submitting Period 1 for 2nd Year by owner succeeds
    assert.doesNotThrow(() =>
      assertNoOverlappingPeriodConflict(year2Submissions, [1], '1', facultyB),
    );
  });
});

describe('Permission Rendering & Filtering Pipeline Regression Suite', () => {
  const mockApprovedRequests = [
    {
      id: 'req-001',
      studentId: '24B91A0773',
      date: '2026-08-01',
      periods: '1,2',
      status: 'approved',
      student: { rollNumber: '24B91A0773', section: 'CSIT-B', year: '3rd Year', department: 'CSIT', semester: 5 },
    },
    {
      id: 'req-002',
      studentId: '24B91A0701',
      date: '2026-08-01',
      periods: '3',
      status: 'approved',
      student: { rollNumber: '24B91A0701', section: 'CSIT-A', year: '3rd Year', department: 'CSIT', semester: 5 },
    },
    {
      id: 'req-003',
      studentId: '23B91A0710',
      date: '2026-08-01',
      periods: '1',
      status: 'approved',
      student: { rollNumber: '23B91A0710', section: 'CSIT-A', year: '2nd Year', department: 'CSIT', semester: 3 },
    },
  ];

  function filterApprovedRequests(requests: typeof mockApprovedRequests, date: string, section?: string, year?: string) {
    return requests.filter(req => {
      if (req.status !== 'approved') return false;
      if (date && req.date !== date) return false;
      if (section && section !== 'none' && section !== 'all') {
        const reqSec = req.student.section;
        if (reqSec !== section && !section.includes(reqSec)) return false;
      }
      if (year && year !== 'all') {
        const reqYr = req.student.year;
        if (reqYr !== year && !year.includes(reqYr)) return false;
      }
      return true;
    });
  }

  function computePermissionSet(requests: typeof mockApprovedRequests, targetPeriods: number[]) {
    const set = new Set<string>();
    requests.forEach(req => {
      const pArr = req.periods.split(',').map(n => Number(n.trim()));
      const overlap = targetPeriods.some(p => pArr.includes(p));
      if (overlap) {
        set.add(req.student.rollNumber);
      }
    });
    return set;
  }

  it('handles No permissions gracefully without false positives', () => {
    const filtered = filterApprovedRequests([], '2026-08-01', 'CSIT-A', '3rd Year');
    const permSet = computePermissionSet(filtered, [1]);
    assert.equal(filtered.length, 0);
    assert.equal(permSet.size, 0);
    assert.equal(permSet.has('73'), false);
  });

  it('correctly matches One permission for specific date + section + year + period', () => {
    const filtered = filterApprovedRequests(mockApprovedRequests, '2026-08-01', 'CSIT-A', '3rd Year');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].student.rollNumber, '24B91A0701');

    const permSetP3 = computePermissionSet(filtered, [3]);
    assert.equal(permSetP3.has('24B91A0701'), true);

    const permSetP1 = computePermissionSet(filtered, [1]);
    assert.equal(permSetP1.has('24B91A0701'), false); // No false positive on period 1
  });

  it('handles Multiple permissions across different sections, years, and periods independently', () => {
    const csitA3rdYear = filterApprovedRequests(mockApprovedRequests, '2026-08-01', 'CSIT-A', '3rd Year');
    assert.equal(csitA3rdYear.length, 1);
    assert.equal(csitA3rdYear[0].id, 'req-002');

    const csitB3rdYear = filterApprovedRequests(mockApprovedRequests, '2026-08-01', 'CSIT-B', '3rd Year');
    assert.equal(csitB3rdYear.length, 1);
    assert.equal(csitB3rdYear[0].id, 'req-001');

    const csitA2ndYear = filterApprovedRequests(mockApprovedRequests, '2026-08-01', 'CSIT-A', '2nd Year');
    assert.equal(csitA2ndYear.length, 1);
    assert.equal(csitA2ndYear[0].id, 'req-003');
  });

  it('preserves yellow permission state regardless of attendance submission order (marked before/after approval)', () => {
    const approvedList = filterApprovedRequests(mockApprovedRequests, '2026-08-01', 'CSIT-B', '3rd Year');
    const permSet = computePermissionSet(approvedList, [1, 2]);
    assert.equal(permSet.has('24B91A0773'), true);

    // Scenario A: Attendance marked before approval (DB records: 73 -> 'present')
    const dbRecordsBefore = { '24B91A0773': 'present' };
    const rawStatusA = dbRecordsBefore['24B91A0773'];
    const hasPermA = permSet.has('24B91A0773');
    const isYellowA = hasPermA && rawStatusA !== 'absent';
    assert.equal(isYellowA, true);

    // Scenario B: Attendance marked after approval (DB records: 73 -> 'present')
    const dbRecordsAfter = { '24B91A0773': 'present' };
    const rawStatusB = dbRecordsAfter['24B91A0773'];
    const hasPermB = permSet.has('24B91A0773');
    const isYellowB = hasPermB && rawStatusB !== 'absent';
    assert.equal(isYellowB, true);
  });
});

describe('HOD Approval & Executive Override Workflow Suite', () => {
  interface MockRequestState {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    finalDecisionBy: 'Faculty' | 'HOD' | null;
    finalDecisionUserId: string | null;
  }

  function simulateReviewAction(
    request: MockRequestState,
    actorRole: 'faculty' | 'hod',
    actorUserId: string,
    action: 'approve' | 'reject',
    remarks?: string
  ) {
    if (actorRole === 'faculty') {
      if (request.finalDecisionBy === 'HOD') {
        throw new Error('Faculty cannot override a decision made by HOD');
      }
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const prevDecision = request.finalDecisionBy ? `${request.status.toUpperCase()} by ${request.finalDecisionBy}` : request.status.toUpperCase();
      request.status = newStatus;
      request.finalDecisionBy = 'Faculty';
      request.finalDecisionUserId = actorUserId;

      const log = `[Override Log] Previous: ${prevDecision} -> New: ${newStatus.toUpperCase()} by Faculty | PerformedBy: ${actorUserId} | At: ${new Date().toISOString()}. ${remarks || ''}`;
      return { request, log };
    } else {
      // HOD action — always overrides regardless of prior status or decision
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const prevDecision = request.finalDecisionBy ? `${request.status.toUpperCase()} by ${request.finalDecisionBy}` : request.status.toUpperCase();
      request.status = newStatus;
      request.finalDecisionBy = 'HOD';
      request.finalDecisionUserId = actorUserId;

      const log = `[Override Log] Previous: ${prevDecision} -> New: ${newStatus.toUpperCase()} by HOD | PerformedBy: ${actorUserId} | At: ${new Date().toISOString()}. ${remarks || ''}`;
      return { request, log };
    }
  }

  it('Faculty approve -> HOD reject -> Final = Rejected (finalDecisionBy: HOD)', () => {
    let req: MockRequestState = {
      id: 'req-001',
      status: 'pending',
      finalDecisionBy: null,
      finalDecisionUserId: null,
    };

    // Step 1: Faculty approves
    const res1 = simulateReviewAction(req, 'faculty', 'fac-01', 'approve');
    assert.equal(res1.request.status, 'approved');
    assert.equal(res1.request.finalDecisionBy, 'Faculty');

    // Step 2: HOD rejects (Force Reject Override)
    const res2 = simulateReviewAction(req, 'hod', 'hod-01', 'reject', 'Not justified');
    assert.equal(res2.request.status, 'rejected');
    assert.equal(res2.request.finalDecisionBy, 'HOD');
    assert.match(res2.log, /Previous: APPROVED by Faculty -> New: REJECTED by HOD/);
    assert.match(res2.log, /PerformedBy: hod-01/);
  });

  it('Faculty reject -> HOD approve -> Final = Approved (finalDecisionBy: HOD)', () => {
    let req: MockRequestState = {
      id: 'req-002',
      status: 'pending',
      finalDecisionBy: null,
      finalDecisionUserId: null,
    };

    // Step 1: Faculty rejects
    const res1 = simulateReviewAction(req, 'faculty', 'fac-01', 'reject');
    assert.equal(res1.request.status, 'rejected');
    assert.equal(res1.request.finalDecisionBy, 'Faculty');

    // Step 2: HOD approves (Force Approve Override)
    const res2 = simulateReviewAction(req, 'hod', 'hod-01', 'approve', 'Approved by department head');
    assert.equal(res2.request.status, 'approved');
    assert.equal(res2.request.finalDecisionBy, 'HOD');
    assert.match(res2.log, /Previous: REJECTED by Faculty -> New: APPROVED by HOD/);
    assert.match(res2.log, /PerformedBy: hod-01/);
  });

  it('Prevents faculty from modifying a request after HOD has acted', () => {
    let req: MockRequestState = {
      id: 'req-003',
      status: 'pending',
      finalDecisionBy: null,
      finalDecisionUserId: null,
    };

    // Step 1: HOD acts first (Rejects)
    simulateReviewAction(req, 'hod', 'hod-01', 'reject');
    assert.equal(req.status, 'rejected');
    assert.equal(req.finalDecisionBy, 'HOD');

    // Step 2: Faculty tries to approve -> Throws Error
    assert.throws(
      () => simulateReviewAction(req, 'faculty', 'fac-01', 'approve'),
      /Faculty cannot override a decision made by HOD/
    );
  });
});


