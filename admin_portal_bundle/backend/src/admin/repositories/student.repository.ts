/**
 * student.repository.ts
 *
 * All Mongoose queries for the student domain live here — and nowhere else.
 * Business logic (uniqueness guards, pagination math, batch logic) belongs in
 * the service layer, not here.
 *
 * Students are stored as User documents with role: 'student'.
 * Soft-deleted records have isActive: false — list queries always exclude them.
 */
import { UserModel } from '../../models/User.js';
import type {
  CreateStudentBody,
  UpdateStudentBody,
  StudentListQuery,
} from '../types/student.types.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Role filter applied to every query so we never accidentally touch staff records */
const STUDENT_FILTER = { role: 'student', isActive: true } as const;

/** Projects away the password hash from Mongoose lean results */
const EXCLUDE_PASSWORD = { password: 0, __v: 0 } as const;

function buildSearchFilter(search: string): object {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, 'i');
  return {
    $or: [
      { name:       pattern },
      { email:      pattern },
      { rollNumber: pattern },
    ],
  };
}

// ── Read queries ──────────────────────────────────────────────────────────────

export async function findStudentById(userId: string): Promise<Record<string, unknown> | null> {
  const doc = await UserModel.findOne(
    { userId, role: 'student', isActive: true },
    EXCLUDE_PASSWORD,
  ).lean<Record<string, unknown>>();
  return doc;
}

export async function findStudentByRollNumber(
  rollNumber: string,
): Promise<Record<string, unknown> | null> {
  const doc = await UserModel.findOne(
    { rollNumber: { $regex: new RegExp(`^${rollNumber}$`, 'i') }, role: 'student', isActive: true },
    EXCLUDE_PASSWORD,
  ).lean<Record<string, unknown>>();
  return doc;
}

export async function findStudentByEmail(email: string): Promise<Record<string, unknown> | null> {
  const doc = await UserModel.findOne(
    { email: email.toLowerCase(), role: 'student', isActive: true },
    EXCLUDE_PASSWORD,
  ).lean<Record<string, unknown>>();
  return doc;
}

export async function listStudents(query: StudentListQuery): Promise<{
  students: Record<string, unknown>[];
  total: number;
}> {
  const filter: Record<string, unknown> = { ...STUDENT_FILTER };

  if (query.search) {
    Object.assign(filter, buildSearchFilter(query.search));
  }
  if (query.department) {
    filter['department'] = query.department;
  }
  if (query.semester !== undefined) {
    filter['semester'] = query.semester;
  }

  const skip = (query.page - 1) * query.pageSize;

  const [students, total] = await Promise.all([
    UserModel.find(filter, EXCLUDE_PASSWORD)
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean<Record<string, unknown>[]>(),
    UserModel.countDocuments(filter),
  ]);

  return { students, total };
}

// ── Write queries ─────────────────────────────────────────────────────────────

export async function createStudent(
  data: CreateStudentBody & { userId: string; password: string },
): Promise<Record<string, unknown>> {
  const created = await UserModel.create({
    ...data,
    role:     'student',
    isActive: true,
  });

  const plain = created.toObject() as unknown as Record<string, unknown>;
  delete plain['password'];
  delete plain['__v'];
  return plain;
}

export async function updateStudent(
  userId: string,
  patch: UpdateStudentBody,
): Promise<Record<string, unknown> | null> {
  const updated = await UserModel.findOneAndUpdate(
    { userId, role: 'student', isActive: true },
    { $set: patch },
    { new: true, projection: EXCLUDE_PASSWORD },
  ).lean<Record<string, unknown>>();
  return updated;
}

/** Soft-delete: sets isActive=false. The record remains in the DB. */
export async function softDeleteStudent(userId: string): Promise<boolean> {
  const result = await UserModel.updateOne(
    { userId, role: 'student', isActive: true },
    { $set: { isActive: false } },
  );
  return result.modifiedCount === 1;
}

// ── Bulk operations ───────────────────────────────────────────────────────────

/** Finds all roll numbers from the given list that already exist in the DB */
export async function findExistingRollNumbers(
  rollNumbers: string[],
): Promise<Set<string>> {
  const docs = await UserModel.find(
    { rollNumber: { $in: rollNumbers }, role: 'student' },
    { rollNumber: 1, _id: 0 },
  ).lean<Array<{ rollNumber?: string }>>();

  return new Set(docs.map((d) => (d.rollNumber ?? '').toLowerCase()));
}

/**
 * Bulk inserts multiple validated student rows.
 * Uses insertMany with ordered:false so a single failure doesn't abort the rest.
 * Returns the number of documents actually inserted.
 */
export async function bulkInsertStudents(
  rows: Array<CreateStudentBody & { userId: string; password: string }>,
): Promise<number> {
  if (rows.length === 0) return 0;

  const docs = rows.map((row) => ({ ...row, role: 'student', isActive: true }));
  const result = await UserModel.insertMany(docs, { ordered: false });
  return result.length;
}

/**
 * Upserts a single student row by rollNumber.
 * Used when IMPORT_DUPLICATE_STRATEGY=upsert.
 */
export async function upsertStudentByRollNumber(
  data: CreateStudentBody & { userId: string; password: string },
): Promise<void> {
  await UserModel.updateOne(
    { rollNumber: data.rollNumber, role: 'student' },
    { $set: { ...data, role: 'student', isActive: true } },
    { upsert: true },
  );
}
