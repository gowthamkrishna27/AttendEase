import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

function formatUserResponse(user: {
  userId: string; email: string; role: string; name: string;
  department: string; designation?: string | null; rollNumber?: string | null;
  semester?: number | null; avatarUrl?: string | null; phone?: string | null;
  dob?: string | null; gender?: string | null; address?: string | null;
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
    ...(user.dob         && { dob:         user.dob         }),
    ...(user.gender      && { gender:      user.gender      }),
    ...(user.address     && { address:     user.address     }),
  };
}

/**
 * GET /api/users/faculty
 * Returns all faculty members — visible to both HODs.
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

    const { name, email, phone, dob, gender, address, avatarUrl, semester, password, currentPassword } = req.body;

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
        ...(dob       !== undefined && { dob       }),
        ...(gender    !== undefined && { gender    }),
        ...(address   !== undefined && { address   }),
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
