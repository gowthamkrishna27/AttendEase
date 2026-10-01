/**
 * invigilation.controller.ts
 *
 * HTTP controller for Admin Invigilation Management endpoints.
 * Handles validation, delegates to invigilation.service.ts, and formats HTTP responses.
 */
import type { Request, Response, NextFunction } from 'express';
import {
  createDutySchema,
  updateDutySchema,
  filterQuerySchema,
} from '../validators/invigilation.validator.js';
import * as invigilationService from '../services/invigilation.service.js';

export async function getDuties(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filter = filterQuerySchema.parse(req.query);
    const result = await invigilationService.listDuties(filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDuty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const duty = await invigilationService.getDutyById(req.params['id'] as string);
    res.json({ duty });
  } catch (err) {
    next(err);
  }
}

export async function createDuty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validatedBody = createDutySchema.parse(req.body);
    const duty = await invigilationService.createDuty(validatedBody);
    res.status(201).json({ duty });
  } catch (err) {
    next(err);
  }
}

export async function updateDuty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validatedPatch = updateDutySchema.parse(req.body);
    const duty = await invigilationService.updateDuty(
      req.params['id'] as string,
      validatedPatch,
    );
    res.json({ duty });
  } catch (err) {
    next(err);
  }
}

export async function deleteDuty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await invigilationService.deleteDuty(req.params['id'] as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
