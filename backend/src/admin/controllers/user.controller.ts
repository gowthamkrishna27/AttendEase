/**
 * user.controller.ts
 *
 * HTTP adapter for User Management endpoints (admin CRUD on users).
 * No business logic — delegates entirely to user.service.ts.
 */
import type { Request, Response, NextFunction } from 'express';
import {
  createUserSchema,
  updateUserSchema,
} from '../validators/user.validator.js';
import * as userService from '../services/user.service.js';

export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { role } = req.query;
    const result = await userService.listUsers(typeof role === 'string' ? role : undefined);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await userService.createUser(body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const patch = updateUserSchema.parse(req.body);
    const user  = await userService.updateUser(req.params['id'] as string, patch);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await userService.deleteUser(req.params['id'] as string);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function deleteMultipleUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userIds = (req.body.userIds || req.body.ids) as string[];
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds array is required' });
      return;
    }
    const result = await userService.deleteMultipleUsers(userIds);
    res.json({ success: true, message: `Successfully deleted ${result.deletedCount} users.`, ...result });
  } catch (err) {
    next(err);
  }
}
