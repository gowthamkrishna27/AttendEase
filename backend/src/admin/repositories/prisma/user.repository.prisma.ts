/**
 * user.repository.prisma.ts
 *
 * Prisma + Supabase implementation of IUserRepository.
 * Drop-in replacement for user.repository.ts (Mongoose).
 *
 * To activate: in user.service.ts, change:
 *   import * as userRepo from '../repositories/user.repository.js';
 * to:
 *   import * as userRepo from '../repositories/prisma/user.repository.prisma.js';
 *
 * No other file needs to change.
 */
import { prisma } from '../../../db/prisma.js';
import type { IUserRepository } from '../interfaces/user.repository.interface.js';
import type { CreateUserBody, UpdateUserBody } from '../../types/user.types.js';

// ── Read queries ──────────────────────────────────────────────────────────────

export async function listAllUsers(): ReturnType<IUserRepository['listAllUsers']> {
  const records = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    omit:    { password: true },
  });
  return records as unknown as Record<string, unknown>[];
}

export async function findUserByUserId(userId: string): ReturnType<IUserRepository['findUserByUserId']> {
  const record = await prisma.user.findFirst({
    where: {
      OR: [{ userId }, { id: userId }],
    },
    omit:  { password: true },
  });
  return record as Record<string, unknown> | null;
}

export async function findUserByEmail(email: string): ReturnType<IUserRepository['findUserByEmail']> {
  const record = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    omit:  { password: true },
  });
  return record as Record<string, unknown> | null;
}

export async function findUserWithPasswordByUserId(
  userId: string,
): ReturnType<IUserRepository['findUserWithPasswordByUserId']> {
  const record = await prisma.user.findFirst({
    where:  {
      OR: [{ userId }, { id: userId }],
      isActive: true,
    },
    select: { password: true },
  });
  return record;
}

export async function countActiveAdmins(): ReturnType<IUserRepository['countActiveAdmins']> {
  return prisma.user.count({ where: { role: 'admin', isActive: true } });
}

// ── Write queries ─────────────────────────────────────────────────────────────

export async function createUser(
  data: Omit<CreateUserBody, 'password'> & { password: string },
): ReturnType<IUserRepository['createUser']> {
  const record = await prisma.user.create({
    data:  { ...data, isActive: true },
    omit:  { password: true },
  });
  return record as unknown as Record<string, unknown>;
}

export async function updateUser(
  userId: string,
  patch: UpdateUserBody,
): ReturnType<IUserRepository['updateUser']> {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ userId }, { id: userId }],
        isActive: true,
      },
      select: { id: true },
    });
    if (!existing) return null;

    const record = await prisma.user.update({
      where: { id: existing.id },
      data:  patch,
      omit:  { password: true },
    });
    return record as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function softDeleteUser(userId: string): ReturnType<IUserRepository['softDeleteUser']> {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ userId }, { id: userId }],
      },
      select: { id: true },
    });
    if (!existing) return false;

    // Hard delete — permanently removes the user record from the DB
    await prisma.user.delete({
      where: { id: existing.id },
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateUserPassword(
  userId: string,
  hashedPassword: string,
): ReturnType<IUserRepository['updateUserPassword']> {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ userId }, { id: userId }],
        isActive: true,
      },
      select: { id: true },
    });
    if (!existing) return false;

    await prisma.user.update({
      where: { id: existing.id },
      data:  { password: hashedPassword },
    });
    return true;
  } catch {
    return false;
  }
}
