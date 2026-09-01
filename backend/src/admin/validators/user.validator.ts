/**
 * user.validator.ts
 * Zod v4 schemas for User Management and Password Management endpoints.
 *
 * Password policy values (minLength, requireUppercase, requireNumber) are read
 * from adminConfig — not hardcoded here.
 */
import { z } from 'zod';
import { passwordConfig } from '../config/admin.config.js';
import { toCanonicalSection } from '../../constants/canonicalSections.js';

// ── Password field builder (respects env-configured policy) ───────────────────

function buildPasswordSchema(label = 'Password'): z.ZodString {
  let schema = z.string({ error: `${label} is required` }).min(
    passwordConfig.minLength,
    `${label} must be at least ${passwordConfig.minLength} characters`,
  );

  if (passwordConfig.requireUppercase) {
    schema = schema.regex(/[A-Z]/, `${label} must contain at least one uppercase letter`);
  }

  if (passwordConfig.requireNumber) {
    schema = schema.regex(/[0-9]/, `${label} must contain at least one number`);
  }

  return schema;
}

// ── User roles ────────────────────────────────────────────────────────────────

const userRoleEnum = z.enum(['student', 'faculty', 'hod', 'admin']);

// ── Create user schema ────────────────────────────────────────────────────────

export const createUserSchema = z
  .object({
    userId:      z.string().trim().min(1, 'userId is required').max(50),
    name:        z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email:       z.string().email('Must be a valid email').toLowerCase().trim(),
    role:        userRoleEnum,
    department:  z.string().trim().min(1, 'Department is required').max(50),
    password:    z.string().min(1, 'Password is required'),
    rollNumber:  z.string().trim().max(20).optional(),
    semester:    z.coerce.number().int().min(1).max(10).optional(),
    year:        z.string().trim().optional(),
    section:     z.string().trim().optional(),
    counselorId: z.string().trim().optional(),
    avatarUrl:   z.string().trim().optional(),
  })
  .refine(
    (data) => data.role !== 'student' || !!data.rollNumber,
    { message: 'rollNumber is required for student users', path: ['rollNumber'] },
  )
  .refine(
    (data) => !data.section || toCanonicalSection(data.department, data.section) !== null,
    { message: 'Invalid section. Allowed canonical sections are CSD, CSIT-A, CSIT-B', path: ['section'] },
  );

// ── Update user schema ────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name:        z.string().trim().min(2).max(100).optional(),
  email:       z.string().email().toLowerCase().trim().optional(),
  role:        userRoleEnum.optional(),
  department:  z.string().trim().min(1).max(50).optional(),
  rollNumber:  z.string().trim().max(20).optional(),
  semester:    z.coerce.number().int().min(1).max(10).optional(),
  year:        z.string().trim().optional(),
  section:     z.string().trim().optional(),
  counselorId: z.string().trim().optional(),
  avatarUrl:   z.string().trim().optional(),
  password:    z.string().trim().optional(),
}).refine(
  (body) => Object.values(body).some((v) => v !== undefined),
  { message: 'At least one field must be provided for update' },
).refine(
  (data) => !data.section || toCanonicalSection(data.department, data.section) !== null,
  { message: 'Invalid section. Allowed canonical sections are CSD, CSIT-A, CSIT-B', path: ['section'] },
);

// ── Self password change (requires current password confirmation) ──────────────

export const selfPasswordChangeSchema = z.object({
  currentPassword: z.string({ error: 'Current password is required' }).min(1),
  newPassword:     buildPasswordSchema('New password'),
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from the current password', path: ['newPassword'] },
);

// ── Admin password reset (no current password needed — elevated privilege) ────

export const adminPasswordResetSchema = z.object({
  newPassword: buildPasswordSchema('New password'),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateUserInput         = z.infer<typeof createUserSchema>;
export type UpdateUserInput         = z.infer<typeof updateUserSchema>;
export type SelfPasswordChangeInput = z.infer<typeof selfPasswordChangeSchema>;
export type AdminPasswordResetInput = z.infer<typeof adminPasswordResetSchema>;
