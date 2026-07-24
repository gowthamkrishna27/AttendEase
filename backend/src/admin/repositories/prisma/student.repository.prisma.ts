/**
 * student.repository.prisma.ts
 *
 * Prisma + Neon implementation of IStudentRepository.
 * Drop-in replacement for student.repository.ts (Mongoose).
 *
 * To activate: in student.service.ts, change:
 *   import * as studentRepo from '../repositories/student.repository.js';
 * to:
 *   import * as studentRepo from '../repositories/prisma/student.repository.prisma.js';
 *
 * No other file needs to change.
 */
import { prisma } from '../../../db/prisma.js';
import type { IStudentRepository } from '../interfaces/student.repository.interface.js';
import type { CreateStudentBody, UpdateStudentBody, StudentListQuery } from '../../types/student.types.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Removes the password from a Prisma User result before returning to callers */
function stripPassword(user: Record<string, unknown>): Record<string, unknown> {
  const { password: _pw, ...safe } = user;
  return safe;
}

function buildSearchWhere(search: string): object {
  return {
    OR: [
      { name:       { contains: search, mode: 'insensitive' as const } },
      { email:      { contains: search, mode: 'insensitive' as const } },
      { rollNumber: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

// ── Read queries ──────────────────────────────────────────────────────────────

export async function findStudentById(userId: string): ReturnType<IStudentRepository['findStudentById']> {
  const record = await prisma.user.findFirst({
    where:  { userId, role: 'student', isActive: true },
    omit:   { password: true },
  });
  return record as Record<string, unknown> | null;
}

export async function findStudentByRollNumber(rollNumber: string): ReturnType<IStudentRepository['findStudentByRollNumber']> {
  const record = await prisma.user.findFirst({
    where: {
      rollNumber: { equals: rollNumber, mode: 'insensitive' },
      role:       'student',
      isActive:   true,
    },
    omit: { password: true },
  });
  return record as Record<string, unknown> | null;
}

export async function findStudentByEmail(email: string): ReturnType<IStudentRepository['findStudentByEmail']> {
  const record = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), role: 'student', isActive: true },
    omit:  { password: true },
  });
  return record as Record<string, unknown> | null;
}

export async function listStudents(query: StudentListQuery): ReturnType<IStudentRepository['listStudents']> {
  const where: Record<string, unknown> = { role: 'student', isActive: true };

  if (query.search)     Object.assign(where, buildSearchWhere(query.search));
  if (query.department) where['department'] = query.department;
  if (query.semester)   where['semester']   = query.semester;

  const skip = (query.page - 1) * query.pageSize;

  const [records, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take:    query.pageSize,
      orderBy: { rollNumber: 'asc' },
      omit:    { password: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    students: records as unknown as Record<string, unknown>[],
    total,
  };
}

// ── Write queries ─────────────────────────────────────────────────────────────

export async function createStudent(
  data: CreateStudentBody & { userId: string; password: string },
): ReturnType<IStudentRepository['createStudent']> {
  const record = await prisma.user.create({
    data:  { ...data, role: 'student', isActive: true },
    omit:  { password: true },
  });
  return record as unknown as Record<string, unknown>;
}

export async function updateStudent(
  userId: string,
  patch: UpdateStudentBody,
): ReturnType<IStudentRepository['updateStudent']> {
  try {
    const record = await prisma.user.update({
      where: { userId },
      data:  patch,
      omit:  { password: true },
    });
    return record as unknown as Record<string, unknown>;
  } catch {
    // Prisma throws when the record is not found
    return null;
  }
}

export async function softDeleteStudent(userId: string): ReturnType<IStudentRepository['softDeleteStudent']> {
  try {
    await prisma.user.update({
      where: { userId, role: 'student', isActive: true },
      data:  { isActive: false },
    });
    return true;
  } catch {
    return false;
  }
}

// ── Bulk operations ───────────────────────────────────────────────────────────

export async function findExistingRollNumbers(
  rollNumbers: string[],
): ReturnType<IStudentRepository['findExistingRollNumbers']> {
  const records = await prisma.user.findMany({
    where:  { rollNumber: { in: rollNumbers }, role: 'student' },
    select: { rollNumber: true },
  });
  return new Set(
    records
      .map((r: { rollNumber: string | null }) => r.rollNumber?.toLowerCase())
      .filter((r: string | undefined): r is string => !!r),
  );
}

export async function bulkInsertStudents(
  rows: Array<CreateStudentBody & { userId: string; password: string }>,
): ReturnType<IStudentRepository['bulkInsertStudents']> {
  if (rows.length === 0) return 0;

  const result = await prisma.user.createMany({
    data:          rows.map((row) => ({ ...row, role: 'student', isActive: true })),
    skipDuplicates: true,  // skips rows where userId or email already exists
  });

  return result.count;
}

export async function upsertStudentByRollNumber(
  data: CreateStudentBody & { userId: string; password: string },
): ReturnType<IStudentRepository['upsertStudentByRollNumber']> {
  await prisma.user.upsert({
    where:  { userId: data.userId },
    create: { ...data, role: 'student', isActive: true },
    update: { ...data, isActive: true },
  });
}
