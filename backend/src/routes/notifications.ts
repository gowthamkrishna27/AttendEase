import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();
router.use(verifyToken);

/**
 * GET /api/notifications — list notifications for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: user.id },
          { user: { email: { equals: user.email, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      notifications: notifications.map(n => ({
        id:        n.id,
        type:      n.type,
        title:     n.title,
        message:   n.message,
        isRead:    n.isRead,
        createdAt: n.createdAt,
        requestId: n.requestId ?? undefined,
      })),
    });
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * PATCH /api/notifications/read-all — mark all notifications as read
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: user.id },
          { user: { email: { equals: user.email, mode: 'insensitive' } } },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/read-all error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * PATCH /api/notifications/:id/read — mark single notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: {
        id: req.params['id'],
        OR: [
          { userId: user.id },
          { user: { email: { equals: user.email, mode: 'insensitive' } } },
        ],
      },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
