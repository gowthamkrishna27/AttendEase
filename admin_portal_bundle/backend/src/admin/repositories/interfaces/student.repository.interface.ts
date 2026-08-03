/**
 * student.repository.interface.ts
 *
 * TypeScript contract that every student repository implementation must satisfy.
 * Both the Mongoose (current) and Prisma (future) implementations implement this
 * interface so the service layer never needs to know which DB it's talking to.
 *
 * To switch databases: change one import line in student.service.ts.
 */
import type { CreateStudentBody, UpdateStudentBody, StudentListQuery } from '../../types/student.types.js';

export interface IStudentRepository {
  findStudentById(userId: string): Promise<Record<string, unknown> | null>;

  findStudentByRollNumber(rollNumber: string): Promise<Record<string, unknown> | null>;

  findStudentByEmail(email: string): Promise<Record<string, unknown> | null>;

  listStudents(query: StudentListQuery): Promise<{
    students: Record<string, unknown>[];
    total:    number;
  }>;

  createStudent(
    data: CreateStudentBody & { userId: string; password: string },
  ): Promise<Record<string, unknown>>;

  updateStudent(
    userId: string,
    patch: UpdateStudentBody,
  ): Promise<Record<string, unknown> | null>;

  /** Soft-delete: marks isActive = false. Returns true if a record was updated. */
  softDeleteStudent(userId: string): Promise<boolean>;

  /** Returns the set of roll numbers (lowercased) that already exist in the DB */
  findExistingRollNumbers(rollNumbers: string[]): Promise<Set<string>>;

  /**
   * Batch-insert new student rows. Uses ordered=false (Mongoose) or skipDuplicates
   * (Prisma) so a single bad row doesn't abort the entire batch.
   * Returns the number of rows actually inserted.
   */
  bulkInsertStudents(
    rows: Array<CreateStudentBody & { userId: string; password: string }>,
  ): Promise<number>;

  /**
   * Upsert a single row by rollNumber.
   * Used when IMPORT_DUPLICATE_STRATEGY=upsert.
   */
  upsertStudentByRollNumber(
    data: CreateStudentBody & { userId: string; password: string },
  ): Promise<void>;
}
