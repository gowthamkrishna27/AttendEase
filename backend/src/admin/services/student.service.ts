/**
 * student.service.ts
 *
 * Business logic for student CRUD. Calls repositories for DB access.
 * Responsibilities:
 *   - Uniqueness checks (roll number, email) before create/update
 *   - Generating a deterministic userId from the roll number
 *   - Hashing the default student password
 *   - Mapping DB records to public API response shapes
 *   - Pagination calculation
 */
import * as studentRepo from '../repositories/prisma/student.repository.prisma.js';
import { hashPassword } from './password.service.js';
import { paginationConfig } from '../config/admin.config.js';
import type {
  CreateStudentBody,
  UpdateStudentBody,
  StudentListQuery,
  StudentResponse,
  StudentListResponse,
} from '../types/student.types.js';

// ── Custom errors (caught by controllers and mapped to HTTP status codes) ─────

export class StudentNotFoundError extends Error {
  constructor(id: string) {
    super(`Student with id "${id}" not found.`);
    this.name = 'StudentNotFoundError';
  }
}

export class DuplicateRollNumberError extends Error {
  constructor(rollNumber: string) {
    super(`A student with roll number "${rollNumber}" already exists.`);
    this.name = 'DuplicateRollNumberError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A student with email "${email}" already exists.`);
    this.name = 'DuplicateEmailError';
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function toUserId(rollNumber: string): string {
  return `stu-${rollNumber}`;
}

function toResponse(record: Record<string, unknown>): StudentResponse {
  return {
    id:         record['userId'] as string,
    name:       record['name'] as string,
    email:      record['email'] as string,
    department: record['department'] as string,
    rollNumber: record['rollNumber'] as string,
    semester:   record['semester'] as number,
    isActive:   (record['isActive'] as boolean) ?? true,
    ...(record['avatarUrl'] ? { avatarUrl: record['avatarUrl'] as string } : {}),
    ...(record['gender']    ? { gender:    record['gender'] as string    } : {}),
    ...(record['phone']     ? { phone:     record['phone'] as string     } : {}),
    ...(record['dob']       ? { dob:       record['dob'] as string       } : {}),
    ...(record['address']   ? { address:   record['address'] as string   } : {}),
  };
}

function clampPageSize(pageSize: number): number {
  return Math.min(pageSize, paginationConfig.maxPageSize);
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listStudents(query: StudentListQuery): Promise<StudentListResponse> {
  const page     = Math.max(query.page, 1);
  const pageSize = clampPageSize(query.pageSize);

  const { students, total } = await studentRepo.listStudents({ ...query, page, pageSize });

  return {
    students:   students.map((s) => toResponse(s as unknown as Record<string, unknown>)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getStudentById(userId: string): Promise<StudentResponse> {
  const record = await studentRepo.findStudentById(userId);
  if (!record) throw new StudentNotFoundError(userId);
  return toResponse(record as unknown as Record<string, unknown>);
}

export async function createStudent(body: CreateStudentBody): Promise<StudentResponse> {
  const existingRoll = await studentRepo.findStudentByRollNumber(body.rollNumber);
  if (existingRoll) throw new DuplicateRollNumberError(body.rollNumber);

  const existingEmail = await studentRepo.findStudentByEmail(body.email);
  if (existingEmail) throw new DuplicateEmailError(body.email);

  const hashedPassword = await hashPassword(body.rollNumber);
  const userId         = toUserId(body.rollNumber);

  const record = await studentRepo.createStudent({
    ...body,
    userId,
    password: hashedPassword,
  });

  return toResponse(record as unknown as Record<string, unknown>);
}

export async function updateStudent(
  userId: string,
  patch: UpdateStudentBody,
): Promise<StudentResponse> {
  if (patch.rollNumber) {
    const existing = await studentRepo.findStudentByRollNumber(patch.rollNumber);
    const asRecord = existing as unknown as Record<string, unknown> | null;
    if (asRecord && asRecord['userId'] !== userId) {
      throw new DuplicateRollNumberError(patch.rollNumber);
    }
  }

  if (patch.email) {
    const existing = await studentRepo.findStudentByEmail(patch.email);
    const asRecord = existing as unknown as Record<string, unknown> | null;
    if (asRecord && asRecord['userId'] !== userId) {
      throw new DuplicateEmailError(patch.email);
    }
  }

  const record = await studentRepo.updateStudent(userId, patch);
  if (!record) throw new StudentNotFoundError(userId);
  return toResponse(record as unknown as Record<string, unknown>);
}

export async function deleteStudent(userId: string): Promise<void> {
  const deleted = await studentRepo.softDeleteStudent(userId);
  if (!deleted) throw new StudentNotFoundError(userId);
}
