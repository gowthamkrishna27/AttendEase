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


