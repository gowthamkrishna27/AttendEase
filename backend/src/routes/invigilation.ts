/**
 * invigilation.ts
 *
 * Faculty-facing endpoints for invigilation duties.
 *
 * GET /api/invigilation/my-duties — Returns assigned invigilation duties for the logged-in faculty
 *                                    within the 3-calendar-day window (Asia/Kolkata), excluding completed duties.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

/**
 * Calculates the current UTC timestamp and the upper UTC boundary
 * for the end of the +3rd calendar day in Asia/Kolkata timezone.
 *
 * Example: If today is Aug 31 in Asia/Kolkata:
 * - Visible days: Aug 31 (today), Sep 1 (+1), Sep 2 (+2), Sep 3 (+3)
 * - Upper bound: Sep 3 23:59:59.999 IST (= Sep 3 18:29:59.999 UTC)
 */
export function getKolkataCalendarBounds(now: Date = new Date()) {
  const currentTime = now;

  // Format today's date in Asia/Kolkata (YYYY-MM-DD)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.format(now).split('-');
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10) - 1; // 0-indexed month
  const day = parseInt(parts[2]!, 10);

  // +3 calendar days in IST at 23:59:59.999
  const plus3DayDate = new Date(Date.UTC(year, month, day + 3, 23, 59, 59, 999));
  // IST is UTC + 5h30m -> subtract 330 minutes to get the UTC ISO timestamp
  const maxEndUtc = new Date(plus3DayDate.getTime() - (5 * 60 + 30) * 60 * 1000);

  return {
    currentTime,
    maxEndUtc,
  };
}

/**
 * GET /api/invigilation/my-duties
 * Authenticated faculty endpoint.
 */
router.get('/my-duties', verifyToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.user;

    if (!authUser || (authUser.role !== 'faculty' && authUser.role !== 'hod')) {
      res.status(403).json({ error: 'Access denied. Faculty role required.' });
      return;
    }

    // Resolve exact database user ID
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: authUser.id },
          { userId: authUser.id },
          { email: authUser.email },
        ],
        role: { in: ['faculty', 'hod'] },
      },
      select: { id: true, userId: true, name: true, department: true },
    });

    if (!dbUser) {
      res.status(404).json({ error: 'Faculty account not found.' });
      return;
    }

    const { currentTime, maxEndUtc } = getKolkataCalendarBounds();

    // Query assignments for logged-in faculty only
    const duties = await prisma.invigilationDuty.findMany({
      where: {
        assignments: {
          some: {
            facultyId: dbUser.id,
          },
        },
        endDateTime: {
          gte: currentTime, // Exclude completed duties (currentTime > endDateTime)
        },
        startDateTime: {
          lte: maxEndUtc, // Up to +3 calendar days in Asia/Kolkata
        },
      },
      include: {
        assignments: {
          where: {
            facultyId: dbUser.id,
          },
          select: {
            id: true,
            dutyType: true,
          },
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    const nowMs = currentTime.getTime();

    const formattedDuties = duties.map((duty) => {
      const startMs = duty.startDateTime.getTime();
      const endMs   = duty.endDateTime.getTime();
      const isInProgress = startMs <= nowMs && nowMs <= endMs;
      const assignment = duty.assignments[0];

      return {
        id:            duty.id,
        examType:      duty.examType,
        examName:      duty.examName,
        subjectName:   duty.subjectName,
        startDateTime: duty.startDateTime.toISOString(),
        endDateTime:   duty.endDateTime.toISOString(),
        blockName:     duty.blockName,
        roomNumber:    duty.roomNumber,
        dutyType:      assignment?.dutyType ?? null,
        status:        isInProgress ? ('IN_PROGRESS' as const) : ('UPCOMING' as const),
      };
    });

    // In-progress duties first, then by nearest startDateTime ascending
    formattedDuties.sort((a, b) => {
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    });

    res.json({
      duties: formattedDuties,
      total: formattedDuties.length,
    });
  } catch (err) {
    console.error('[FacultyInvigilationError]', err);
    res.status(500).json({ error: 'Failed to retrieve invigilation duties.' });
  }
});

export default router;
