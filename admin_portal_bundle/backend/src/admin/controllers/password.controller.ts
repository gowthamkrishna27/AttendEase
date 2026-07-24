/**
 * password.controller.ts
 *
 * HTTP adapter for password management endpoints:
 *   - PATCH /api/admin/users/me/password    (self-change — any authenticated user)
 *   - PATCH /api/admin/users/:id/password   (admin reset — admin only, enforced in routes)
 */
import type { Request, Response, NextFunction } from 'express';
import {
  selfPasswordChangeSchema,
  adminPasswordResetSchema,
} from '../validators/user.validator.js';
import * as userService from '../services/user.service.js';

export async function changeSelfPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = selfPasswordChangeSchema.parse(req.body);
    const userId = req.user!.id;

    await userService.changeSelfPassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function adminResetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { newPassword } = adminPasswordResetSchema.parse(req.body);
    const targetUserId    = req.params['id'] as string;

    await userService.resetUserPassword(targetUserId, newPassword);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}
