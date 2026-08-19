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
    const counselees = await (prisma.user as any).findMany({
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
    const studentUserIds = counselees.map((s: any) => s.userId);
    const rollNumbers = counselees.map((s: any) => s.rollNumber || s.userId).filter(Boolean) as string[];
    const rollSuffixes = rollNumbers.map(r => r.length > 2 ? r.slice(-2) : r);
    const allRollTargets = Array.from(new Set([...rollNumbers, ...rollSuffixes]));

    // Batch fetch attendance records and approved permissions
    const [allRecords, approvedRequests] = await Promise.all([
      (prisma as any).attendanceRecord ? (prisma as any).attendanceRecord.findMany({
        where: { rollNumber: { in: allRollTargets } },
      }) : Promise.resolve([]),
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
    (allRecords as any[]).forEach((r: any) => {
      const existing = recordsByRoll.get(r.rollNumber) || [];
      recordsByRoll.set(r.rollNumber, [...existing, r]);
    });

    const approvedCountByStudent = new Map<string, number>();
    (approvedRequests as any[]).forEach((reqItem: any) => {
      approvedCountByStudent.set(reqItem.studentId, (approvedCountByStudent.get(reqItem.studentId) || 0) + 1);
    });

    // Compute stats for each counselee in-memory
    const counseleesWithStats = counselees.map((student: any) => {
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
 * GET /api/users/students
 * Returns all students with derived section and year — used by HOD Direct Exemption Modal.
 */
router.get('/students', verifyToken, async (_req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      orderBy: { rollNumber: 'asc' },
    });

    const formatted = students.map((s: any) => {
      const roll = s.rollNumber || s.userId;
      const isSecB = /(7[3-9]|[89]\d|[A-C]\d|D[01]|LE\d+)$/i.test(roll) || roll.endsWith('-B') || roll.includes('95A');
      const derivedSec = isSecB ? 'Section B' : 'Section A';
      const sem = s.semester || 6;
      const derivedYear = `${Math.ceil(sem / 2)}th Year`;

      return {
        id:         s.userId,
        name:       s.name,
        email:      s.email,
        rollNumber: roll,
        department: s.department || 'Computer Science',
        semester:   sem,
        year:       derivedYear,
        section:    s.section || derivedSec,
        avatarUrl:  s.avatarUrl ?? undefined,
      };
    });

    res.json({ students: formatted });
  } catch (err) {
    console.error('GET /users/students error:', err);
    res.status(500).json({ error: 'Failed to fetch students list' });
  }
});


/**
 * GET /api/users/counseling/all
 * Returns all faculty members along with their assigned counseling students.
 */
router.get('/counseling/all', verifyToken, async (_req: Request, res: Response) => {
  try {
    const facultyList = await (prisma.user as any).findMany({
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

    const unassignedStudents = await (prisma.user as any).findMany({
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
      facultyCounselors: facultyList.map((f: any) => ({
        ...formatUserResponse(f),
        counselees: (f.counselees || []).map((s: any) => ({
          id: s.userId,
          name: s.name,
          email: s.email,
          rollNumber: s.rollNumber ?? s.userId,
          department: s.department,
          semester: s.semester ?? undefined,
          avatarUrl: s.avatarUrl ?? undefined,
        })),
      })),
      unassignedStudents: unassignedStudents.map((s: any) => ({
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
    const updated = await (prisma.user as any).updateMany({
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

    await (prisma.user as any).updateMany({
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

    const { name, email, phone, avatarUrl, semester, designation, password, currentPassword } = req.body;

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
        ...(name        !== undefined && { name        }),
        ...(email       !== undefined && { email       }),
        ...(phone       !== undefined && { phone       }),
        ...(avatarUrl   !== undefined && { avatarUrl   }),
        ...(semester    !== undefined && { semester: Number(semester) }),
        ...(designation !== undefined && { designation }),
        ...(password    !== undefined && { password    }),
      },
    });

    res.json({ user: formatUserResponse(updated) });
  } catch (err) {
    console.error('PUT /users/me error:', err);
    res.status(500).json({ error: 'Failed to update personal information' });
  }
});

/**
 * GET /api/users/proxy-image
 * Proxies remote images (e.g. SRKR exam portal, Cloudinary) to avoid CORS in Excel export
 */
router.get('/proxy-image', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).send('Image URL required');
      return;
    }
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      res.status(response.status).send('Failed to fetch remote image');
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    console.error('Proxy image error:', err);
    res.status(500).send(err.message || 'Error proxying image');
  }
});

export default router;
