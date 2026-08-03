/**
 * student.validator.ts
 * Zod v4 schemas for Student CRUD endpoints.
 *
 * The `createStudentSchema` is the canonical definition of a valid student record.
 * It is imported by import.validator.ts to validate every Excel row — keeping
 * validation logic in one place.
 */
import { z } from 'zod';

// ── Shared field definitions ──────────────────────────────────────────────────

const rollNumberField = z
  .string()
  .trim()
  .min(1, 'Roll number cannot be empty')
  .max(20, 'Roll number must be 20 characters or fewer');

const nameField = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be 100 characters or fewer');

const emailField = z
  .string()
  .email('Must be a valid email address')
  .toLowerCase()
  .trim();

const departmentField = z
  .string()
  .trim()
  .min(1, 'Department cannot be empty')
  .max(50, 'Department must be 50 characters or fewer');

const semesterField = z
  .number({ error: 'Semester must be a number' })
  .int('Semester must be a whole number')
  .min(1, 'Semester must be between 1 and 10')
  .max(10, 'Semester must be between 1 and 10');

const genderField = z
  .enum(['Male', 'Female', 'Other', 'Prefer not to say'], {
    error: 'Gender must be one of: Male, Female, Other, Prefer not to say',
  })
  .optional();

const avatarUrlField = z.string().url('avatarUrl must be a valid URL').optional();

// ── Create schema (all required fields present) ───────────────────────────────

export const createStudentSchema = z.object({
  rollNumber: rollNumberField,
  name:       nameField,
  email:      emailField,
  department: departmentField,
  semester:   semesterField,
  gender:     genderField,
  avatarUrl:  avatarUrlField,
  phone:      z.string().trim().max(20).optional(),
  dob:        z.string().trim().optional(),
  address:    z.string().trim().max(300).optional(),
});

// ── Update schema (all fields optional — PATCH semantics) ─────────────────────

export const updateStudentSchema = z.object({
  rollNumber: rollNumberField.optional(),
  name:       nameField.optional(),
  email:      emailField.optional(),
  department: departmentField.optional(),
  semester:   semesterField.optional(),
  gender:     genderField,
  avatarUrl:  avatarUrlField,
  phone:      z.string().trim().max(20).optional(),
  dob:        z.string().trim().optional(),
  address:    z.string().trim().max(300).optional(),
}).refine(
  (body) => Object.values(body).some((v) => v !== undefined),
  { message: 'At least one field must be provided for update' },
);

// ── Query params schema for list endpoint ─────────────────────────────────────

export const studentListQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  pageSize:   z.coerce.number().int().min(1).max(100).default(20),
  search:     z.string().trim().optional(),
  department: z.string().trim().optional(),
  semester:   z.coerce.number().int().min(1).max(10).optional(),
});

// ── Inferred types (in sync with the schema, no manual duplication) ───────────

export type CreateStudentInput    = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput    = z.infer<typeof updateStudentSchema>;
export type StudentListQueryInput = z.infer<typeof studentListQuerySchema>;
