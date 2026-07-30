import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

function formatUserResponse(user: {
  userId: string; email: string; role: string; name: string;
  department: string; designation?: string | null; rollNumber?: string | null;
  semester?: number | null; avatarUrl?: string | null; phone?: string | null;
  counselorId?: string | null;
}) {
  return {
    id:          user.userId,
    email:       user.email,
    role:        user.role,
    name:        user.name,
    department:  user.department,
    ...(user.designation && { designation: user.designation }),
    ...(user.rollNumber  && { rollNumber:  user.rollNumber  }),
    ...(user.semester    && { semester:    user.semester    }),
    ...(user.avatarUrl   && { avatarUrl:   user.avatarUrl   }),
    ...(user.phone       && { phone:       user.phone       }),
    ...(user.counselorId  && { counselorId:  user.counselorId  }),
  };
}

/**
 * GET /api/users/counselees
 * Returns counseling students assigned to the currently logged in faculty member,
 * along with their attendance percentage analytics calculated from database records.
 */
router.get('/counselees', verifyToken, async (req: Request, res: Response) => {
  try {
    const facultyUserId = req.user!.id;
    const counselees = await prisma.user.findMany({
      where: {
        role: 'student',
        counselorId: facultyUserId,
      },
      orderBy: { rollNumber: 'asc' },
    });

    if (counselees.length === 0) {
      res.json({ counselees: [] });
      return;
    }

    // Collect all roll numbers and user IDs for batch querying
    const studentUserIds = counselees.map(s => s.userId);
    const rollNumbers = counselees.map(s => s.rollNumber || s.userId).filter(Boolean) as string[];
    const rollSuffixes = rollNumbers.map(r => r.length > 2 ? r.slice(-2) : r);
    const allRollTargets = Array.from(new Set([...rollNumbers, ...rollSuffixes]));

    // Batch fetch attendance records and approved permissions
    const [allRecords, approvedRequests] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { rollNumber: { in: allRollTargets } },
      }),
      prisma.request.findMany({
        where: {
          studentId: { in: studentUserIds },
          status: 'approved',
        },
        select: { studentId: true },
      }),
    ]);

    // Group records by roll number and approved requests by studentId
    const recordsByRoll = new Map<string, typeof allRecords>();
    allRecords.forEach(r => {
      const existing = recordsByRoll.get(r.rollNumber) || [];
      recordsByRoll.set(r.rollNumber, [...existing, r]);
    });

    const approvedCountByStudent = new Map<string, number>();
    approvedRequests.forEach(reqItem => {
      approvedCountByStudent.set(reqItem.studentId, (approvedCountByStudent.get(reqItem.studentId) || 0) + 1);
    });

    // Compute stats for each counselee in-memory
    const counseleesWithStats = counselees.map(student => {
      const roll = student.rollNumber || student.userId;
      const suffix = roll.length > 2 ? roll.slice(-2) : roll;

      const fullRecords = recordsByRoll.get(roll) || [];
      const suffixRecords = roll !== suffix ? (recordsByRoll.get(suffix) || []) : [];
      
      // Combine unique record IDs
      const recordMap = new Map<string, typeof fullRecords[0]>();
      [...fullRecords, ...suffixRecords].forEach(rec => recordMap.set(rec.id, rec));
      const studentRecords = Array.from(recordMap.values());

      const conductedCount = studentRecords.length;
      const presentCount = studentRecords.filter(r => r.status === 'present').length;
      const approvedPermissionsCount = approvedCountByStudent.get(student.userId) || 0;

      const effectivePresent = presentCount + approvedPermissionsCount;
      const percentage = conductedCount > 0
        ? Math.min(100, Math.round((effectivePresent / conductedCount) * 100))
        : 85;

      return {
        ...formatUserResponse(student),
        stats: {
          conductedCount,
          presentCount,
          approvedPermissionsCount,
          absentCount: conductedCount - presentCount,
          percentage,
        },
      };
    });

    res.json({ counselees: counseleesWithStats });
  } catch (err) {
    console.error('GET /users/counselees error:', err);
    res.status(500).json({ error: 'Failed to fetch counseling students' });
  }
});

/**
 * GET /api/users/faculty
 * Returns all faculty members — visible to both HODs and Admin.
 */
router.get('/faculty', verifyToken, async (_req: Request, res: Response) => {
  try {
    const docs = await prisma.user.findMany({ where: { role: 'faculty' } });
    res.json({ faculty: docs.map(formatUserResponse) });
  } catch (err) {
    console.error('GET /users/faculty error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/users/counseling/all
 * Returns all faculty members along with their assigned counseling students.
 */
router.get('/counseling/all', verifyToken, async (_req: Request, res: Response) => {
  try {
    const facultyList = await prisma.user.findMany({
      where: { role: 'faculty' },
      include: {
        counselees: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
            semester: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const unassignedStudents = await prisma.user.findMany({
      where: {
        role: 'student',
        counselorId: null,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        rollNumber: true,
        department: true,
        semester: true,
        avatarUrl: true,
      },
      orderBy: { rollNumber: 'asc' },
    });

    res.json({
      facultyCounselors: facultyList.map(f => ({
        ...formatUserResponse(f),
        counselees: f.counselees.map(s => ({
          id: s.userId,
          name: s.name,
          email: s.email,
          rollNumber: s.rollNumber ?? s.userId,
          department: s.department,
          semester: s.semester ?? undefined,
          avatarUrl: s.avatarUrl ?? undefined,
        })),
      })),
      unassignedStudents: unassignedStudents.map(s => ({
        id: s.userId,
        name: s.name,
        email: s.email,
        rollNumber: s.rollNumber ?? s.userId,
        department: s.department,
        semester: s.semester ?? undefined,
        avatarUrl: s.avatarUrl ?? undefined,
      })),
    });
  } catch (err) {
    console.error('GET /users/counseling/all error:', err);
    res.status(500).json({ error: 'Failed to fetch counseling data' });
  }
});

/**
 * POST /api/users/counseling/assign
 * Bulk assigns students to a faculty counselor.
 */
router.post('/counseling/assign', verifyToken, async (req: Request, res: Response) => {
  try {
    const { facultyId, studentIds } = req.body as { facultyId: string; studentIds: string[] };

    if (!facultyId || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ error: 'facultyId and non-empty studentIds array are required' });
      return;
    }

    // Verify faculty exists
    const faculty = await prisma.user.findFirst({
      where: { OR: [{ userId: facultyId }, { id: facultyId }] },
    });

    if (!faculty) {
      res.status(404).json({ error: 'Faculty member not found' });
      return;
    }

    // Assign counselorId to students
    const updated = await prisma.user.updateMany({
      where: {
        OR: [
          { userId: { in: studentIds } },
          { id: { in: studentIds } },
          { rollNumber: { in: studentIds } },
        ],
      },
      data: { counselorId: faculty.userId },
    });

    res.json({
      success: true,
      message: `Assigned ${updated.count} student(s) to ${faculty.name}`,
      count: updated.count,
    });
  } catch (err) {
    console.error('POST /users/counseling/assign error:', err);
    res.status(500).json({ error: 'Failed to assign counseling students' });
  }
});

/**
 * POST /api/users/counseling/unassign
 * Unassigns a student from their counselor.
 */
router.post('/counseling/unassign', verifyToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body as { studentId: string };

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    await prisma.user.updateMany({
      where: {
        OR: [
          { userId: studentId },
          { id: studentId },
          { rollNumber: studentId },
        ],
      },
      data: { counselorId: null },
    });

    res.json({ success: true, message: 'Student unassigned successfully' });
  } catch (err) {
    console.error('POST /users/counseling/unassign error:', err);
    res.status(500).json({ error: 'Failed to unassign student' });
  }
});

/**
 * GET /api/users/me
 * Returns current user profile from PostgreSQL.
 */
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: req.user!.id },
          { email:  req.user!.email },
        ],
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('GET /users/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/users/me
 * Updates current user personal info.
 */
router.put('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: req.user!.id },
          { email:  req.user!.email },
        ],
      },
    });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, email, phone, avatarUrl, semester, password, currentPassword } = req.body;

    // Handle password change
    if (password && String(password).trim().length > 0) {
      if (currentPassword) {
        const cur = String(currentPassword).trim();
        const dbPwd = String(existing.password).trim();
        if (dbPwd !== cur && dbPwd.toLowerCase() !== cur.toLowerCase()) {
          res.status(400).json({ error: 'Current password does not match' });
          return;
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(name      !== undefined && { name      }),
        ...(email     !== undefined && { email     }),
        ...(phone     !== undefined && { phone     }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(semester  !== undefined && { semester: Number(semester) }),
        ...(password  !== undefined && { password  }),
      },
    });

    res.json({ user: formatUserResponse(updated) });
  } catch (err) {
    console.error('PUT /users/me error:', err);
    res.status(500).json({ error: 'Failed to update personal information' });
  }
});

export default router;
