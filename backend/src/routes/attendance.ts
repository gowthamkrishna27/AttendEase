import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

/**
 * GET /api/attendance
 * Retrieve attendance submissions for a section and date.
 * Publicly accessible (used by both Faculty portal & public /permissions page).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, section, year } = req.query;

    const targetDate = typeof date === 'string' && date.trim() 
      ? date.trim() 
      : new Date().toISOString().split('T')[0];

    const whereClause: Record<string, unknown> = {
      date: targetDate,
    };

    if (typeof section === 'string' && section !== 'all' && section.trim()) {
      const s = section.trim();
      const sClean = s.replace(/[\s-]/g, '');
      whereClause['OR'] = [
        { section: s },
        { section: { contains: s, mode: 'insensitive' } },
        { section: { contains: sClean, mode: 'insensitive' } },
      ];
    }
    if (typeof year === 'string' && year.trim()) {
      whereClause['year'] = year.trim();
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
 * Strictly enforces that only the original submitter can update their submission.
 */
router.post('/submit', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'faculty' && user.role !== 'hod' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only faculty members can submit attendance' });
    }

    const { date, section, year = '3rd Year', periods, periodLabel, records } = req.body;

    if (!date || !section || !periods || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing required attendance fields (date, section, periods, records)' });
    }

    const incomingPeriods = (function parsePeriods(p: any): number[] {
      if (Array.isArray(p)) return p.map(n => Number(n)).filter(n => !isNaN(n));
      if (typeof p === 'number') return [p];
      if (typeof p === 'string') {
        if (p.includes(',')) return p.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
        if (p.includes('-')) {
          const parts = p.split('-');
          const start = Number(parts[0]);
          const end = Number(parts[1]);
          if (!isNaN(start) && !isNaN(end)) {
            const arr: number[] = [];
            for (let i = start; i <= end; i++) arr.push(i);
            return arr;
          }
        }
        const num = Number(p);
        if (!isNaN(num)) return [num];
      }
      return [];
    })(periods);

    // Fetch all existing submissions for this date & section to check for overlapping period locks
    const existingSubmissions = await prisma.attendanceSubmission.findMany({
      where: { date, section },
      include: {
        markedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Enforce strict period lock: No other faculty can submit attendance for any overlapping period
    for (const sub of existingSubmissions) {
      const subPeriods = (function parsePeriods(p: any): number[] {
        if (Array.isArray(p)) return p.map(n => Number(n)).filter(n => !isNaN(n));
        if (typeof p === 'number') return [p];
        if (typeof p === 'string') {
          if (p.includes(',')) return p.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
          if (p.includes('-')) {
            const parts = p.split('-');
            const start = Number(parts[0]);
            const end = Number(parts[1]);
            if (!isNaN(start) && !isNaN(end)) {
              const arr: number[] = [];
              for (let i = start; i <= end; i++) arr.push(i);
              return arr;
            }
          }
          const num = Number(p);
          if (!isNaN(num)) return [num];
        }
        return [];
      })(sub.periods);

      const hasOverlap = incomingPeriods.some(pNum => subPeriods.includes(pNum));
      if (hasOverlap) {
        const isOwner = sub.markedById === user.id || user.role === 'admin';
        if (!isOwner) {
          const conflicting = incomingPeriods.filter(pNum => subPeriods.includes(pNum)).join(', ');
          return res.status(403).json({
            error: `Attendance for Period ${conflicting} has already been submitted by ${sub.markedBy.name}. Only ${sub.markedBy.name} or an Admin can edit attendance for this period.`,
          });
        }
      }
    }

    // Transaction: Upsert AttendanceSubmission and refresh AttendanceRecords
    const submission = await prisma.$transaction(async (tx) => {
      // 1. Upsert Submission header
      const sub = await tx.attendanceSubmission.upsert({
        where: {
          date_section_periods: {
            date,
            section,
            periods,
          },
        },
        update: {
          periodLabel: periodLabel || `Periods ${periods}`,
          markedById: user.id,
          year,
        },
        create: {
          date,
          section,
          year,
          periods,
          periodLabel: periodLabel || `Periods ${periods}`,
          markedById: user.id,
        },
      });

      // 2. Clear old records for this submission ID
      await tx.attendanceRecord.deleteMany({
        where: { submissionId: sub.id },
      });

      // 3. Insert new student attendance records
      if (records.length > 0) {
        await tx.attendanceRecord.createMany({
          data: records.map((rec: { rollNumber: string; status: string }) => ({
            submissionId: sub.id,
            rollNumber: rec.rollNumber,
            status: rec.status,
          })),
        });
      }

      return sub;
    });

    // Return the full updated submission object
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
