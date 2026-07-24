/**
 * password.routes.ts
 *
 * PATCH /api/admin/users/me/password   — self-change (any authenticated user)
 * PATCH /api/admin/users/:id/password  — admin reset (admin only — enforced here)
 *
 * The /me/password route is registered before /:id/password so Express matches
 * the literal string "me" before treating it as a dynamic :id param.
 */
import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import {
  changeSelfPassword,
  adminResetPassword,
} from '../controllers/password.controller.js';

const router = Router();

// Self-change: available to any authenticated user (verifyToken applied at admin router level)
router.patch('/me/password', changeSelfPassword);

// Admin reset: additionally requires admin role
router.patch('/:id/password', requireAdmin, adminResetPassword);

export default router;
