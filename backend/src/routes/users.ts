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

    // Calculate attendance percentage for each counseling student
    const counseleesWithStats = await Promise.all(
      counselees.map(async (student) => {
        const roll = student.rollNumber || student.userId;
        const suffix = roll.length > 2 ? roll.slice(-2) : roll;

        // Total conducted attendance records for this student's roll number
        const records = await prisma.attendanceRecord.findMany({
          where: {
            OR: [
              { rollNumber: roll },
              { rollNumber: suffix },
            ],
          },
        });

        const conductedCount = records.length;
        const presentCount = records.filter(r => r.status === 'present').length;

        // Approved permissions count for this student
        const approvedPermissionsCount = await prisma.request.count({
          where: {
            studentId: student.userId,
            status: 'approved',
          },
        });

        // Attendance percentage calculation
        const effectivePresent = presentCount + approvedPermissionsCount;
        const percentage = conductedCount > 0 
          ? Math.min(100, Math.round((effectivePresent / conductedCount) * 100))
          : 85; // Default 85% if no attendance conducted yet

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
      })
    );

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
