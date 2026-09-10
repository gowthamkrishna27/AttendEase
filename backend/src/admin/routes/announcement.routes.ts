/**
 * announcement.routes.ts
 *
 * Admin routes for managing Announcements, Widgets, and Opening Animations.
 * Mounted under /api/admin/announcements.
 */
import { Router } from 'express';
import * as announcementController from '../controllers/announcement.controller.js';

const router = Router();

// GET /api/admin/announcements — List with filters
router.get('/', announcementController.getAnnouncements);

// POST /api/admin/announcements — Create new announcement
router.post('/', announcementController.createAnnouncement);

// GET /api/admin/announcements/:id — Single detail
router.get('/:id', announcementController.getAnnouncement);

// PUT /api/admin/announcements/:id — Full/partial update
router.put('/:id', announcementController.updateAnnouncement);

// PATCH /api/admin/announcements/:id/state — Activate / Deactivate
router.patch('/:id/state', announcementController.toggleState);

// DELETE /api/admin/announcements/:id — Remove
router.delete('/:id', announcementController.deleteAnnouncement);

export default router;
