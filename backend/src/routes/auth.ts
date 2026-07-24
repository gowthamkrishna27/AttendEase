import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { identifier: string; password: string; role: 'student' | 'faculty' | 'hod' }
 */
router.post('/login', async (req: Request, res: Response) => {
  const { identifier, password, role } = req.body as {
    identifier: string;
    password:   string;
    role:       string;
  };

  if (!identifier || !password || !role) {
    res.status(400).json({ error: 'identifier, password and role are required' });
    return;
  }

  try {
    const q = identifier.trim().toLowerCase();

    // Find by email or rollNumber (case-insensitive via mode: 'insensitive')
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:  { equals: q, mode: 'insensitive' } },
          { userId: { equals: q, mode: 'insensitive' } },
          { rollNumber: { equals: q, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.role !== role) {
      res.status(401).json({ error: `No ${role} account found for those credentials` });
      return;
    }

    if (user.password !== password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload = {
      id:         user.userId,
      email:      user.email,
      role:       user.role,
      name:       user.name,
      department: user.department,
      ...(user.rollNumber && { rollNumber: user.rollNumber }),
      ...(user.semester   && { semester:   user.semester   }),
      ...(user.avatarUrl  && { avatarUrl:  user.avatarUrl  }),
    } as const;

    const token = signToken(payload);
    res.json({ token, user: payload });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * POST /api/auth/logout — stateless (client drops token)
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
