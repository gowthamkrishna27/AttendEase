/**
 * student.controller.ts
 *
 * HTTP adapter for student CRUD.
 * Responsibilities: validate input, call service, format response.
 * No business logic. All errors propagate to globalErrorHandler via next().
 */
import type { Request, Response, NextFunction } from 'express';
import {
  createStudentSchema,
  updateStudentSchema,
  studentListQuerySchema,
} from '../validators/student.validator.js';
import * as studentService from '../services/student.service.js';

export async function getStudents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = studentListQuerySchema.parse(req.query);
    const result = await studentService.listStudents(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const student = await studentService.getStudentById(req.params['id'] as string);
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body    = createStudentSchema.parse(req.body);
    const student = await studentService.createStudent(body);
    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const patch   = updateStudentSchema.parse(req.body);
    const student = await studentService.updateStudent(req.params['id'] as string, patch);
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await studentService.deleteStudent(req.params['id'] as string);
    res.json({ success: true, message: 'Student deleted (soft).' });
  } catch (err) {
    next(err);
  }
}
