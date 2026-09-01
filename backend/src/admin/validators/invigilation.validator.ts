/**
 * invigilation.validator.ts
 *
 * Zod schemas for validating Invigilation Management requests.
 */
import { z } from 'zod';

const examTypeEnum = z.enum(['MID', 'SEM', 'LAB', 'SUPPLEMENTARY']);

export const facultyAssignmentSchema = z.object({
  facultyId: z.string().trim().min(1, 'facultyId is required'),
  dutyType:  z.string().trim().max(100).optional().nullable(),
});

export const createDutySchema = z
  .object({
    examType:        examTypeEnum,
    examName:        z.string().trim().min(1, 'Exam name is required').max(150),
    subjectName:     z.string().trim().min(1, 'Subject name is required').max(150),
    startDateTime:   z
      .string()
      .trim()
      .min(1, 'startDateTime is required')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'startDateTime must be a valid ISO date-time string',
      }),
    endDateTime:     z
      .string()
      .trim()
      .min(1, 'endDateTime is required')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'endDateTime must be a valid ISO date-time string',
      }),
    blockName:       z.string().trim().min(1, 'Block name is required').max(100),
    roomNumber:      z.string().trim().min(1, 'Room number is required').max(100),
    assignedFaculty: z.array(facultyAssignmentSchema).min(1, 'At least one faculty member must be assigned'),
  })
  .refine(
    (data) => new Date(data.endDateTime).getTime() > new Date(data.startDateTime).getTime(),
    { message: 'endDateTime must be strictly after startDateTime', path: ['endDateTime'] },
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
    examName:        z.string().trim().min(1).max(150).optional(),
    subjectName:     z.string().trim().min(1).max(150).optional(),
    startDateTime:   z
      .string()
      .trim()
      .min(1)
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'startDateTime must be a valid ISO date-time string',
      })
      .optional(),
    endDateTime:     z
      .string()
      .trim()
      .min(1)
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'endDateTime must be a valid ISO date-time string',
      })
      .optional(),
    blockName:       z.string().trim().min(1).max(100).optional(),
    roomNumber:      z.string().trim().min(1).max(100).optional(),
    assignedFaculty: z.array(facultyAssignmentSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.startDateTime && data.endDateTime) {
        return new Date(data.endDateTime).getTime() > new Date(data.startDateTime).getTime();
      }
      return true;
    },
    { message: 'endDateTime must be strictly after startDateTime', path: ['endDateTime'] },
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
  facultyId:  z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export type CreateDutyInputValidated = z.infer<typeof createDutySchema>;
export type UpdateDutyInputValidated = z.infer<typeof updateDutySchema>;
export type FilterQueryInputValidated = z.infer<typeof filterQuerySchema>;
