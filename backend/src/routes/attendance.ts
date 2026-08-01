import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a period value (array, number, or string) into a sorted number array.
 * Supports: [1,2], "1,2", "1-2", 1
 */
function parsePeriods(p: unknown): number[] {
  if (Array.isArray(p)) return p.map(n => Number(n)).filter(n => !isNaN(n) && n > 0);
  if (typeof p === 'number' && !isNaN(p)) return [p];
  if (typeof p === 'string') {
    const trimmed = p.trim();
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
    }
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        const arr: number[] = [];
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
      }
    }
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) return [num];
  }
  return [];
}

/**
 * Normalize a periods value to a sorted, deduplicated comma-separated string.
 * e.g. "2,1" → "1,2", [2,1] → "1,2", "1-2" → "1,2"
 */
function normalizePeriods(p: unknown): string {
  const nums = parsePeriods(p);
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.join(',');
}

/** Thrown when incoming periods overlap an existing submission with a different period grouping. */
export class PeriodOverlapError extends Error {
  readonly code = 'PERIOD_OVERLAP';
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'PeriodOverlapError';
  }
}

/** Thrown when a non-owner tries to edit an existing submission. */
export class PeriodLockedError extends Error {
  readonly code = 'PERIOD_LOCKED';
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'PeriodLockedError';
  }
}

type OverlapSubmission = {
  periods: string;
  markedById: string;
  markedBy?: { userId: string; name: string; email: string } | null;
};

type OverlapUser = {
  id: string;
  email: string;
  role: string;
};

/**
 * C3: Reject any submit whose period numbers intersect an existing submission but use
 * a different normalized periods key — even for the original owner or HOD/Admin.
 * Updates must target the exact same (date, section, periods) row via upsert.
 */
export function assertNoOverlappingPeriodConflict(
  existingSubmissions: OverlapSubmission[],
  incomingPeriodNums: number[],
  normalizedPeriods: string,
  user: OverlapUser,
): void {
  for (const sub of existingSubmissions) {
    const subPeriodNums = parsePeriods(sub.periods);
    const subPeriodsNorm = normalizePeriods(sub.periods);
    const overlappingPeriods = incomingPeriodNums.filter(pNum => subPeriodNums.includes(pNum));

    if (overlappingPeriods.length === 0) continue;

    const conflicting = overlappingPeriods.join(', ');
    const ownerName = sub.markedBy?.name ?? 'another faculty member';

    if (subPeriodsNorm !== normalizedPeriods) {
      throw new PeriodOverlapError(
        `Period(s) ${conflicting} are already covered by an existing submission for Period(s) ${subPeriodsNorm} ` +
        `(submitted by ${ownerName}). Select Period(s) ${subPeriodsNorm} to edit that attendance — ` +
        `you cannot create a separate submission for overlapping periods.`,
      );
    }

    const isOriginalOwner =
      sub.markedById === user.id ||
      sub.markedById === (user as { userId?: string }).userId ||
      (sub.markedBy?.email === user.email);

    const isPrivilegedOverride = user.role === 'admin' || user.role === 'hod';

    if (!isOriginalOwner && !isPrivilegedOverride) {
      throw new PeriodLockedError(
        `Attendance for Period(s) ${conflicting} has already been submitted by ${ownerName}. ` +
        `Only ${ownerName} (original submitter), HOD, or an Admin can edit this attendance.`,
      );
    }
  }
}

/**
 * Get today's date string in IST (UTC+5:30) as YYYY-MM-DD.
 * Prevents timezone bugs where UTC midnight flips the date while IST is still the same day.
 */
function getTodayIST(): string {
  const now = new Date();
  // IST = UTC + 330 minutes
  const istOffset = 330 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return istNow.toISOString().split('T')[0];
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance
 * Retrieve attendance submissions for a specific section and date.
 * Publicly accessible (used by both Faculty portal & public /permissions page).
 *
 * Query params:
 *   date    - YYYY-MM-DD (defaults to today IST)
 *   section - e.g. "CSIT-B" (required for meaningful results; skip if absent)
 *   year    - e.g. "3rd Year"
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, section, year } = req.query;

    // Default to today in IST if no date provided
    const targetDate =
      typeof date === 'string' && date.trim()
        ? date.trim()
        : getTodayIST();

    // Build WHERE clause — start with exact date match
    const whereClause: Record<string, unknown> = {
      date: targetDate,
    };

    // Exact case-insensitive section match (Bug 4 fix: no more fuzzy contains)
    if (
      typeof section === 'string' &&
      section !== 'all' &&
      section !== 'none' &&
      section.trim()
    ) {
      whereClause['section'] = {
        equals: section.trim(),
        mode: 'insensitive',
      };
    }

    // Exact year match — do NOT include nulls; that bleeds across years (Bug 3 fix)
    if (typeof year === 'string' && year.trim() && year !== 'all') {
      whereClause['year'] = {
        equals: year.trim(),
        mode: 'insensitive',
      };
    }

    const submissions = await prisma.attendanceSubmission.findMany({
      where: whereClause,
      include: {
        markedBy: {
          select: {
            userId: true,
            name: true,
            email: true,
            department: true,
          },
        },
        records: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching attendance submissions:', error);
    res.status(500).json({ error: 'Failed to fetch attendance submissions' });
  }
});

/**
 * POST /api/attendance/submit
 * Submit or update section attendance for a set of period(s).
 *
 * Rules enforced:
 *   - Only faculty, hod, or admin may submit.
 *   - Attendance date must be today (IST) — no past or future dates.
 *   - Only the original submitter (markedById) may update. HOD/Admin can edit but
 *     do NOT become the new owner.
 *   - No other faculty may submit overlapping periods.
 *   - The overlap check and upsert are inside a single serializable transaction
 *     to prevent race conditions.
 */
router.post('/submit', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (
      !user ||
      (user.role !== 'faculty' && user.role !== 'hod' && user.role !== 'admin')
    ) {
      return res.status(403).json({ error: 'Only faculty members can submit attendance' });
    }

    const { date, section, year = '3rd Year', periods, periodLabel, records } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!date || !section || !periods || !Array.isArray(records)) {
      return res.status(400).json({
        error: 'Missing required fields: date, section, periods, records (array)',
      });
    }

    // ── Bug 2 Fix: Same-day validation (IST) ─────────────────────────────────
    const todayIST = getTodayIST();
    if (date.trim() !== todayIST) {
      return res.status(403).json({
        error: `Attendance can only be submitted for today (${todayIST}). Past or future dates are not allowed.`,
      });
    }

    // ── Bug 7 Fix: Normalize periods string ───────────────────────────────────
    const normalizedPeriods = normalizePeriods(periods);
    if (!normalizedPeriods) {
      return res.status(400).json({ error: 'Invalid periods value provided.' });
    }
    const incomingPeriodNums = parsePeriods(normalizedPeriods);

    // Normalize section (trim whitespace)
    const normalizedSection = section.trim();

    // ── Bug 5 Fix: Atomic overlap check + upsert in a single transaction ─────
    let submission: { id: string };
    try {
      submission = await prisma.$transaction(async (tx) => {
        // 1. Lock-read existing submissions for this date+section inside the transaction
        const existingSubmissions = await tx.attendanceSubmission.findMany({
          where: { date: todayIST, section: normalizedSection },
          include: {
            markedBy: {
              select: { userId: true, name: true, email: true },
            },
          },
        });

        // 2. Enforce period overlap + ownership (C3: no duplicate overlapping period rows)
        assertNoOverlappingPeriodConflict(
          existingSubmissions,
          incomingPeriodNums,
          normalizedPeriods,
          user,
        );

        // 3. Upsert the AttendanceSubmission header
        const result = await tx.attendanceSubmission.upsert({
          where: {
            date_section_periods: {
              date: todayIST,
              section: normalizedSection,
              periods: normalizedPeriods,
            },
          },
          update: {
            periodLabel: periodLabel || `Periods ${normalizedPeriods}`,
            year,
            // Bug 1 Fix: Do NOT overwrite markedById on update.
            // The original faculty remains the owner forever.
          },
          create: {
            date: todayIST,
            section: normalizedSection,
            year,
            periods: normalizedPeriods,
            periodLabel: periodLabel || `Periods ${normalizedPeriods}`,
            markedById: user.id,
          },
        });

        // 4. Clear old records and insert new ones atomically
        await tx.attendanceRecord.deleteMany({
          where: { submissionId: result.id },
        });

        if (records.length > 0) {
          await tx.attendanceRecord.createMany({
            data: records.map((rec: { rollNumber: string; status: string }) => ({
              submissionId: result.id,
              rollNumber: String(rec.rollNumber).trim(),
              status: rec.status === 'present' ? 'present' : 'absent',
            })),
            skipDuplicates: true,
          });
        }

        return result;
      }, {
        // Use serializable isolation to prevent concurrent overlap bypass
        isolationLevel: 'Serializable',
      });
    } catch (txErr: unknown) {
      if (txErr instanceof PeriodOverlapError) {
        return res.status(409).json({ error: txErr.message });
      }
      if (txErr instanceof PeriodLockedError) {
        return res.status(403).json({ error: txErr.message });
      }
      const err = txErr as { code?: string; message?: string };
      // Legacy-shaped errors (should not occur after refactor)
      if (err.code === 'PERIOD_LOCKED') {
        return res.status(403).json({ error: err.message });
      }
      if (err.code === 'PERIOD_OVERLAP') {
        return res.status(409).json({ error: err.message });
      }
      // Handle DB unique constraint violation (P2002) from race condition
      if (err.code === 'P2002') {
        return res.status(409).json({
          error:
            'Attendance for one or more of these periods is being submitted simultaneously by another faculty member. ' +
            'Please refresh and check the section details.',
        });
      }
      // Handle serialization failure (Postgres code 40001)
      if (err.code === '40001' || (err.message && err.message.includes('could not serialize'))) {
        return res.status(409).json({
          error:
            'Attendance for one or more of these periods is being submitted simultaneously by another faculty member. ' +
            'Please refresh and check the section details.',
        });
      }
      throw err;
    }

    // ── Return the full updated submission ────────────────────────────────────
    const fullSubmission = await prisma.attendanceSubmission.findUnique({
      where: { id: submission.id },
      include: {
        markedBy: {
          select: { userId: true, name: true, email: true, department: true },
        },
        records: true,
      },
    });

    res.json({
      message: 'Attendance submitted successfully',
      submission: fullSubmission,
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ error: 'Failed to submit attendance' });
  }
});

export default router;
