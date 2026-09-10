/**
 * announcements.test.ts
 *
 * Automated tests for Announcements, Widgets, and Opening Animations logic.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnnouncementStatus,
  matchesTargeting,
} from '../services/announcement.service.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../admin/validators/announcement.validator.js';

describe('Announcement Scheduling & Status Computation', () => {
  const now = new Date('2026-09-05T12:00:00Z');

  it('computes DRAFT when state is DRAFT regardless of dates', () => {
    const status = computeAnnouncementStatus(
      {
        state: 'DRAFT',
        startsAt: new Date('2026-09-01T00:00:00Z'),
        endsAt: new Date('2026-09-10T00:00:00Z'),
      },
      now
    );
    assert.equal(status, 'DRAFT');
  });

  it('computes INACTIVE when state is INACTIVE', () => {
    const status = computeAnnouncementStatus(
      {
        state: 'INACTIVE',
        startsAt: new Date('2026-09-01T00:00:00Z'),
        endsAt: new Date('2026-09-10T00:00:00Z'),
      },
      now
    );
    assert.equal(status, 'INACTIVE');
  });

  it('computes SCHEDULED when startsAt is in the future', () => {
    const status = computeAnnouncementStatus(
      {
        state: 'ACTIVE',
        startsAt: new Date('2026-09-06T00:00:00Z'),
        endsAt: new Date('2026-09-10T00:00:00Z'),
      },
      now
    );
    assert.equal(status, 'SCHEDULED');
  });

  it('computes EXPIRED when endsAt is in the past', () => {
    const status = computeAnnouncementStatus(
      {
        state: 'ACTIVE',
        startsAt: new Date('2026-09-01T00:00:00Z'),
        endsAt: new Date('2026-09-04T00:00:00Z'),
      },
      now
    );
    assert.equal(status, 'EXPIRED');
  });

  it('computes ACTIVE when within start and end date window', () => {
    const status = computeAnnouncementStatus(
      {
        state: 'ACTIVE',
        startsAt: new Date('2026-09-01T00:00:00Z'),
        endsAt: new Date('2026-09-10T00:00:00Z'),
      },
      now
    );
    assert.equal(status, 'ACTIVE');
  });
});

describe('Announcement Audience Targeting', () => {
  const studentCSIT = {
    role: 'student',
    department: 'CSIT',
    year: '3rd Year',
    section: 'CSIT-B',
    semester: 6,
  };

  it('matches when all targeting arrays are empty (open to all)', () => {
    const matched = matchesTargeting(
      {
        targetRoles: [],
        targetYears: [],
        targetDepartments: [],
        targetSections: [],
      },
      studentCSIT
    );
    assert.equal(matched, true);
  });

  it('filters out when role does not match', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['faculty'],
        targetYears: [],
        targetDepartments: [],
        targetSections: [],
      },
      studentCSIT
    );
    assert.equal(matched, false);
  });

  it('matches matching role', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['student', 'faculty'],
        targetYears: [],
        targetDepartments: [],
        targetSections: [],
      },
      studentCSIT
    );
    assert.equal(matched, true);
  });

  it('filters out when department does not match', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['student'],
        targetYears: [],
        targetDepartments: ['ECE', 'MECH'],
        targetSections: [],
      },
      studentCSIT
    );
    assert.equal(matched, false);
  });

  it('matches matching department', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['student'],
        targetYears: [],
        targetDepartments: ['CSIT'],
        targetSections: [],
      },
      studentCSIT
    );
    assert.equal(matched, true);
  });

  it('matches matching year and section', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['student'],
        targetYears: ['3rd Year', '3'],
        targetDepartments: ['CSIT'],
        targetSections: ['CSIT-B'],
      },
      studentCSIT
    );
    assert.equal(matched, true);
  });

  it('filters out non-matching section', () => {
    const matched = matchesTargeting(
      {
        targetRoles: ['student'],
        targetYears: [],
        targetDepartments: [],
        targetSections: ['CSIT-A'],
      },
      studentCSIT
    );
    assert.equal(matched, false);
  });
});

describe('Announcement Zod Validation', () => {
  it('validates a correct banner announcement', () => {
    const validBanner = {
      title: 'Mid Term Exams Schedule Announced',
      type: 'BANNER',
      mediaType: 'TEXT',
      content: 'Please check your exam hall tickets.',
      placement: 'HOME_TOP',
      state: 'ACTIVE',
      displayMode: 'EVERY_PAGE_LOAD',
    };

    const parsed = createAnnouncementSchema.parse(validBanner);
    assert.equal(parsed.title, 'Mid Term Exams Schedule Announced');
    assert.equal(parsed.type, 'BANNER');
    assert.equal(parsed.mediaType, 'TEXT');
  });

  it('fails if IFRAME mediaType has no srcUrl', () => {
    const invalidIframe = {
      title: 'Live Cricket Score',
      type: 'WIDGET',
      mediaType: 'IFRAME',
      placement: 'HOME_MIDDLE',
    };

    assert.throws(() => {
      createAnnouncementSchema.parse(invalidIframe);
    }, /Source URL is required for IFRAME media type/);
  });

  it('validates valid IFRAME widget', () => {
    const validIframe = {
      title: 'HPL Live Cricket Score',
      type: 'WIDGET',
      mediaType: 'IFRAME',
      srcUrl: 'https://csdcsitcricket.up.railway.app/widget/live',
      externalUrl: 'https://csdcsitcricket.up.railway.app',
      placement: 'HOME_MIDDLE',
      height: 180,
      width: 380,
      state: 'ACTIVE',
    };

    const parsed = createAnnouncementSchema.parse(validIframe);
    assert.equal(parsed.srcUrl, 'https://csdcsitcricket.up.railway.app/widget/live');
    assert.equal(parsed.height, 180);
  });

  it('fails if endsAt is before startsAt', () => {
    const invalidDates = {
      title: 'Invalid schedule',
      type: 'BANNER',
      mediaType: 'TEXT',
      content: 'Test content',
      startsAt: '2026-09-10T00:00:00Z',
      endsAt: '2026-09-01T00:00:00Z',
    };

    assert.throws(() => {
      createAnnouncementSchema.parse(invalidDates);
    }, /End time must be after start time/);
  });
});
