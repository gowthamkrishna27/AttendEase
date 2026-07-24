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
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await userService.listUsers();
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
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
}
