/**
 * announcements.ts
 *
 * Student / Client-facing routes for Dynamic Announcements, Widgets, and Opening Animations.
 * Mounted under /api/announcements.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import * as announcementService from '../services/announcement.service.js';

const router = Router();

/**
 * GET /api/announcements
 * Returns only eligible active announcements for the authenticated user.
 */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Look up fresh user details from PostgreSQL database
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: tokenUser.id },
          { id: tokenUser.id },
          { email: { equals: tokenUser.email, mode: 'insensitive' } },
        ],
      },
      select: {
        userId: true,
        role: true,
        department: true,
        year: true,
        section: true,
        semester: true,
      },
    });

    const userContext = dbUser || {
      userId: tokenUser.id,
      role: tokenUser.role,
      department: tokenUser.department,
      year: null,
      section: null,
      semester: tokenUser.semester ?? null,
    };

    const eligibleAnnouncements = await announcementService.getEligibleAnnouncements(userContext);
    res.json({ announcements: eligibleAnnouncements });
  } catch (err: any) {
    console.error('Error fetching student announcements:', err);
    // Failure isolation: Return empty announcements list so student home never breaks
    res.json({ announcements: [] });
  }
});

/**
 * POST /api/announcements/:id/view
 * Tracks an impression / view for an announcement.
 */
router.post('/:id/view', verifyToken, async (req: Request, res: Response) => {
  try {
    const announcementId = req.params['id'] as string;
    const userId = req.user?.id;
    if (!userId || !announcementId) {
      res.status(400).json({ error: 'announcementId and user required' });
      return;
    }

    await announcementService.recordAnnouncementView(announcementId, userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error recording announcement view:', err);
    res.json({ success: false });
  }
});

/**
 * POST /api/announcements/:id/dismiss
 * Tracks a user dismissal for an announcement.
 */
router.post('/:id/dismiss', verifyToken, async (req: Request, res: Response) => {
  try {
    const announcementId = req.params['id'] as string;
    const userId = req.user?.id;
    if (!userId || !announcementId) {
      res.status(400).json({ error: 'announcementId and user required' });
      return;
    }

    await announcementService.recordAnnouncementDismissal(announcementId, userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error recording announcement dismissal:', err);
    res.json({ success: false });
  }
});

/**
 * POST /api/announcements/:id/click
 * Tracks a CTA click for an announcement.
 */
router.post('/:id/click', verifyToken, async (req: Request, res: Response) => {
  try {
    const announcementId = req.params['id'] as string;
    const userId = req.user?.id;
    if (!userId || !announcementId) {
      res.status(400).json({ error: 'announcementId and user required' });
      return;
    }

    await announcementService.recordAnnouncementClick(announcementId, userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error recording announcement click:', err);
    res.json({ success: false });
  }
});

export default router;
