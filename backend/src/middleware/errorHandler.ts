/**
 * errorHandler.ts
 *
 * Centralized Express error-handling middleware.
 *
 * All named error classes from the service layer are mapped to deterministic
 * HTTP status codes here — controllers never decide status codes themselves.
 *
 * Usage: mounted LAST in index.ts (after all routes) so it catches everything.
 *
 *   app.use(globalErrorHandler);
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  StudentNotFoundError,
  DuplicateRollNumberError,
  DuplicateEmailError,
} from '../admin/services/student.service.js';
import {
  UserNotFoundError,
  DuplicateUserError,
  LastAdminError,
  InvalidCurrentPasswordError,
} from '../admin/services/user.service.js';
import { PasswordPolicyError } from '../admin/services/password.service.js';

// ── Error → HTTP status mapping ───────────────────────────────────────────────

function resolveStatusCode(err: Error): number {
  if (err instanceof ZodError) return 422;
  if (err instanceof SyntaxError || ('status' in err && (err as any).status === 400)) return 400;

  if (
    err instanceof DuplicateRollNumberError ||
    err instanceof DuplicateEmailError      ||
    err instanceof DuplicateUserError       ||
    err instanceof PasswordPolicyError      ||
    err instanceof InvalidCurrentPasswordError
  ) return 400;

  if (
    err instanceof StudentNotFoundError ||
    err instanceof UserNotFoundError
  ) return 404;

  if (err instanceof LastAdminError) return 409;

  return 500;
}

// ── Global error handler ──────────────────────────────────────────────────────

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = resolveStatusCode(err);

  // Enforce security headers on error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none';");

  // Zod validation errors get a structured array of field-level messages
  if (err instanceof ZodError) {
    const fieldErrors = err.issues.map((issue) => ({
      field:   issue.path.join('.'),
      message: issue.message,
    }));
    res.status(status).json({ error: 'Validation failed', fieldErrors });
    return;
  }

  // Known domain errors — safe to surface the message to the client
  if (status < 500) {
    res.status(status).json({ error: err.message });
    return;
  }

  // Unexpected server errors — log full error server-side, never leak details to client
  console.error('[UnhandledError]', err);
  res.status(500).json({ error: 'Internal error' });
}
