/**
 * user.service.ts
 *
 * Business logic for admin User Management.
 * Key responsibility: guard against deleting the last admin account.
 */
import * as userRepo from '../repositories/prisma/user.repository.prisma.js';
import { hashPassword, verifyPassword } from './password.service.js';
import type {
  CreateUserBody,
  UpdateUserBody,
  UserResponse,
  UserListResponse,
} from '../types/user.types.js';

// ── Custom errors ─────────────────────────────────────────────────────────────

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with id "${id}" not found.`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateUserError extends Error {
  constructor(field: string, value: string) {
    super(`A user with ${field} "${value}" already exists.`);
    this.name = 'DuplicateUserError';
  }
}

export class LastAdminError extends Error {
  constructor() {
    super('Cannot delete the last active admin account. Add another admin first.');
    this.name = 'LastAdminError';
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super('Current password is incorrect.');
    this.name = 'InvalidCurrentPasswordError';
  }
}

// ── Internal helper ───────────────────────────────────────────────────────────

function toResponse(doc: Record<string, unknown>): UserResponse {
  return {
    id:         doc['userId'] as string,
    name:       doc['name'] as string,
    email:      doc['email'] as string,
    role:       doc['role'] as UserResponse['role'],
    department: doc['department'] as string,
    isActive:   (doc['isActive'] as boolean) ?? true,
    ...(doc['rollNumber'] ? { rollNumber: doc['rollNumber'] as string } : {}),
    ...(doc['year']       ? { year:       doc['year'] as string       } : {}),
    ...(doc['section']    ? { section:    doc['section'] as string    } : {}),
    ...(doc['semester']   ? { semester:   doc['semester'] as number   } : {}),
    ...(doc['avatarUrl']  ? { avatarUrl:  doc['avatarUrl'] as string  } : {}),
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listUsers(): Promise<UserListResponse> {
  const docs = await userRepo.listAllUsers();
  return { users: docs.map((d) => toResponse(d as unknown as Record<string, unknown>)) };
}

export async function createUser(body: CreateUserBody): Promise<UserResponse> {
  const byId = await userRepo.findUserByUserId(body.userId);
  if (byId) throw new DuplicateUserError('userId', body.userId);

  const byEmail = await userRepo.findUserByEmail(body.email);
  if (byEmail) throw new DuplicateUserError('email', body.email);

  const payload = { ...body };
  const rawYear = (payload as any).year;
  if (rawYear) {
    const digit = parseInt(String(rawYear).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(digit) && digit >= 1 && digit <= 4) {
      if (!payload.semester || Math.ceil(payload.semester / 2) !== digit) {
        payload.semester = (digit * 2) - 1;
      }
    }
  }

  // Store raw password directly for auth login matching
  const doc = await userRepo.createUser({ ...payload, password: body.password });
  return toResponse(doc as unknown as Record<string, unknown>);
}

export async function updateUser(userId: string, patch: UpdateUserBody): Promise<UserResponse> {
  if (patch.email) {
    const byEmail  = await userRepo.findUserByEmail(patch.email);
    const existing = byEmail as unknown as Record<string, unknown> | null;
    if (existing && (existing['userId'] !== userId && existing['id'] !== userId)) {
      throw new DuplicateUserError('email', patch.email);
    }
  }

  const payload = { ...patch };
  const rawYear = (payload as any).year;
  if (rawYear) {
    const digit = parseInt(String(rawYear).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(digit) && digit >= 1 && digit <= 4) {
      if (!payload.semester || Math.ceil(payload.semester / 2) !== digit) {
        payload.semester = (digit * 2) - 1;
      }
    }
  }

  const doc = await userRepo.updateUser(userId, payload);
  if (!doc) throw new UserNotFoundError(userId);
  return toResponse(doc as unknown as Record<string, unknown>);
}

export async function deleteUser(userId: string): Promise<void> {
  const target    = await userRepo.findUserByUserId(userId);
  const asRecord  = target as unknown as Record<string, unknown> | null;
  if (!asRecord) throw new UserNotFoundError(userId);

  if (asRecord['role'] === 'admin') {
    const adminCount = await userRepo.countActiveAdmins();
    if (adminCount <= 1) throw new LastAdminError();
  }

  const deleted = await userRepo.softDeleteUser(userId);
  if (!deleted) throw new UserNotFoundError(userId);
}

export async function deleteMultipleUsers(userIds: string[]): Promise<{ deletedCount: number }> {
  if (!userIds || userIds.length === 0) return { deletedCount: 0 };

  // Guard against deleting all admins if any admins are in userIds
  const adminCount = await userRepo.countActiveAdmins();
  let adminInSelection = 0;
  for (const id of userIds) {
    const target = await userRepo.findUserByUserId(id);
    const asRecord = target as unknown as Record<string, unknown> | null;
    if (asRecord && asRecord['role'] === 'admin') {
      adminInSelection++;
    }
  }

  if (adminInSelection > 0 && adminInSelection >= adminCount) {
    throw new LastAdminError();
  }

  const deletedCount = await userRepo.deleteMultipleUsers(userIds);
  return { deletedCount };
}

export async function changeSelfPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const record = await userRepo.findUserWithPasswordByUserId(userId);
  if (!record) throw new UserNotFoundError(userId);

  const cur = currentPassword.trim();
  const dbPwd = (record.password || '').trim();
  const isValid = dbPwd === cur || (await verifyPassword(currentPassword, record.password).catch(() => false));
  if (!isValid) throw new InvalidCurrentPasswordError();

  await userRepo.updateUserPassword(userId, newPassword);
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  const user = await userRepo.findUserByUserId(userId);
  if (!user) throw new UserNotFoundError(userId);

  await userRepo.updateUserPassword(userId, newPassword);
}
