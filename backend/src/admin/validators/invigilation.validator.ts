/**
 * invigilation.validator.ts
 *
 * Zod schemas for validating Invigilation Management requests.
 */
import { z } from 'zod';

const examTypeEnum = z.enum(['MID', 'SEM', 'LAB', 'SUPPLEMENTARY']);
const sessionTypeEnum = z.enum(['MORNING', 'AFTERNOON']);

// Optional time string in HH:mm format, or empty/null = no time
const optionalTimeSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(val),
    { message: 'Time must be in HH:mm format (24-hour)' }
  )
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const facultyAssignmentSchema = z.object({
  facultyId: z.string().trim().min(1, 'facultyId is required'),
});

export const createDutySchema = z
  .object({
    examType:        examTypeEnum,
    date:            z
      .string()
      .trim()
      .min(1, 'Date is required')
      .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
        message: 'Date must be in YYYY-MM-DD format',
      }),
    session:         sessionTypeEnum,
    startTime:       optionalTimeSchema,
    endTime:         optionalTimeSchema,
    assignedFaculty: z.array(facultyAssignmentSchema).min(1, 'At least one faculty member must be assigned'),
  })
  .refine(
    (data) => {
      // If both times provided, end must be after start
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  )
  .refine(
    (data) => {
      const ids = data.assignedFaculty.map((f) => f.facultyId);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate faculty assignments detected in payload', path: ['assignedFaculty'] },
  );

export const updateDutySchema = z
  .object({
    examType:        examTypeEnum.optional(),
    date:            z
      .string()
      .trim()
      .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
        message: 'Date must be in YYYY-MM-DD format',
      })
      .optional(),
    session:         sessionTypeEnum.optional(),
    startTime:       optionalTimeSchema,
    endTime:         optionalTimeSchema,
    assignedFaculty: z.array(facultyAssignmentSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  )
  .refine(
    (data) => {
      if (data.assignedFaculty) {
        const ids = data.assignedFaculty.map((f) => f.facultyId);
        return new Set(ids).size === ids.length;
      }
      return true;
    },
    { message: 'Duplicate faculty assignments detected in payload', path: ['assignedFaculty'] },
  )
  .refine(
    (body) => Object.values(body).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' },
  );

export const filterQuerySchema = z.object({
  date:       z.string().trim().optional(),
  startDate:  z.string().trim().optional(),
  endDate:    z.string().trim().optional(),
  examType:   examTypeEnum.optional(),
  session:    sessionTypeEnum.optional(),
  facultyId:  z.string().trim().optional(),
  department: z.string().trim().optional(),
});
