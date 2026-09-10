/**
 * announcement.controller.ts
 *
 * HTTP controller for Admin Announcement & Widget Management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  toggleStateSchema,
  filterAnnouncementsQuerySchema,
} from '../validators/announcement.validator.js';
import * as announcementService from '../../services/announcement.service.js';

export async function getAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter = filterAnnouncementsQuerySchema.parse(req.query);
    const result = await announcementService.listAdminAnnouncements(filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const item = await announcementService.getAnnouncementById(id);
    res.json({ announcement: item });
  } catch (err) {
    next(err);
  }
}

export async function createAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedBody = createAnnouncementSchema.parse(req.body);
    const userId = req.user?.id;
    const item = await announcementService.createAnnouncement({
      ...validatedBody,
      createdById: userId,
    });
    res.status(201).json({ announcement: item });
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const validatedBody = updateAnnouncementSchema.parse(req.body);
    const userId = req.user?.id;
    const item = await announcementService.updateAnnouncement(id, {
      ...validatedBody,
      updatedById: userId,
    });
    res.json({ announcement: item });
  } catch (err) {
    next(err);
  }
}

export async function toggleState(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { state } = toggleStateSchema.parse(req.body);
    const userId = req.user?.id;
    const item = await announcementService.toggleAnnouncementState(id, state, userId);
    res.json({ announcement: item });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = await announcementService.deleteAnnouncement(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
