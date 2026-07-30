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
      whereClause['section'] = section.trim();
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

    // Check if an attendance submission already exists for this date, section, and periods
    const existingSubmission = await prisma.attendanceSubmission.findUnique({
      where: {
        date_section_periods: {
          date,
          section,
          periods,
        },
      },
      include: {
        markedBy: {
          select: { name: true, userId: true },
        },
      },
    });

    // Enforce strict ownership check
    if (existingSubmission && existingSubmission.markedById !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        error: `Attendance for ${periodLabel || `Period ${periods}`} was submitted by ${existingSubmission.markedBy.name}. Only the submitting faculty member can edit it.`,
      });
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
