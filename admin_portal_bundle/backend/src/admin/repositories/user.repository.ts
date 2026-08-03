/**
 * user.repository.ts
 *
 * All Mongoose queries for the User Management domain.
 * Business logic (last-admin guard, hashing) belongs in the service layer.
 */
import { UserModel } from '../../models/User.js';
import type { CreateUserBody, UpdateUserBody } from '../types/user.types.js';

const EXCLUDE_PASSWORD = { password: 0, __v: 0 } as const;

// ── Read queries ──────────────────────────────────────────────────────────────

export async function listAllUsers(): Promise<Record<string, unknown>[]> {
  return UserModel.find({ isActive: true }, EXCLUDE_PASSWORD)
    .sort({ role: 1, name: 1 })
    .lean<Record<string, unknown>[]>();
}

export async function findUserByUserId(userId: string): Promise<Record<string, unknown> | null> {
  return UserModel.findOne(
    { userId, isActive: true },
    EXCLUDE_PASSWORD,
  ).lean<Record<string, unknown>>();
}

export async function findUserByEmail(email: string): Promise<Record<string, unknown> | null> {
  return UserModel.findOne(
    { email: email.toLowerCase(), isActive: true },
    EXCLUDE_PASSWORD,
  ).lean<Record<string, unknown>>();
}

/** Returns the raw document including the password hash — only for auth operations */
export async function findUserWithPasswordByUserId(
  userId: string,
): Promise<{ password: string } | null> {
  return UserModel.findOne(
    { userId, isActive: true },
    { password: 1 },
  ).lean<{ password: string }>();
}

export async function countActiveAdmins(): Promise<number> {
  return UserModel.countDocuments({ role: 'admin', isActive: true });
}

// ── Write queries ─────────────────────────────────────────────────────────────

export async function createUser(
  data: Omit<CreateUserBody, 'password'> & { password: string },
): Promise<Record<string, unknown>> {
  const created = await UserModel.create({ ...data, isActive: true });
  const plain = created.toObject() as unknown as Record<string, unknown>;
  delete plain['password'];
  delete plain['__v'];
  return plain;
}

export async function updateUser(
  userId: string,
  patch: UpdateUserBody,
): Promise<Record<string, unknown> | null> {
  return UserModel.findOneAndUpdate(
    { userId, isActive: true },
    { $set: patch },
    { new: true, projection: EXCLUDE_PASSWORD },
  ).lean<Record<string, unknown>>();
}

/** Soft-delete: marks the user as inactive. The record is retained in the DB. */
export async function softDeleteUser(userId: string): Promise<boolean> {
  const result = await UserModel.updateOne(
    { userId, isActive: true },
    { $set: { isActive: false } },
  );
  return result.modifiedCount === 1;
}

/** Updates only the password field. Bypasses the pre-save hook (already hashed by service). */
export async function updateUserPassword(
  userId: string,
  hashedPassword: string,
): Promise<boolean> {
  const result = await UserModel.updateOne(
    { userId, isActive: true },
    { $set: { password: hashedPassword } },
  );
  return result.modifiedCount === 1;
}
