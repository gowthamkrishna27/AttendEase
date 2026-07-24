/**
 * user.repository.interface.ts
 *
 * TypeScript contract for the user repository.
 * Both Mongoose (current) and Prisma (future) implementations satisfy this.
 *
 * To switch: change one import line in user.service.ts.
 */
import type { CreateUserBody, UpdateUserBody } from '../../types/user.types.js';

export interface IUserRepository {
  listAllUsers(): Promise<Record<string, unknown>[]>;

  findUserByUserId(userId: string): Promise<Record<string, unknown> | null>;

  findUserByEmail(email: string): Promise<Record<string, unknown> | null>;

  /** Returns a document that includes the password hash — use only for auth operations */
  findUserWithPasswordByUserId(userId: string): Promise<{ password: string } | null>;

  countActiveAdmins(): Promise<number>;

  createUser(
    data: Omit<CreateUserBody, 'password'> & { password: string },
  ): Promise<Record<string, unknown>>;

  updateUser(userId: string, patch: UpdateUserBody): Promise<Record<string, unknown> | null>;

  /** Soft-delete: sets isActive = false. Returns true if a record was updated. */
  softDeleteUser(userId: string): Promise<boolean>;

  /**
   * Stores a pre-hashed password. Bypasses any pre-save hooks.
   * Returns true if the record was updated.
   */
  updateUserPassword(userId: string, hashedPassword: string): Promise<boolean>;
}
