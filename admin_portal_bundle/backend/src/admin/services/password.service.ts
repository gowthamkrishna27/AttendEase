/**
 * password.service.ts
 *
 * Encapsulates all password operations: hashing, comparison, and policy
 * enforcement. Salt rounds come from config — never hardcoded.
 */
import bcrypt from 'bcryptjs';
import { passwordConfig } from '../config/admin.config.js';

// ── Custom error for policy violations ───────────────────────────────────────

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

// ── Policy check ──────────────────────────────────────────────────────────────

/**
 * Validates a plaintext password against the configured policy.
 * Throws PasswordPolicyError describing the first failing rule.
 */
export function enforcePasswordPolicy(password: string): void {
  if (password.length < passwordConfig.minLength) {
    throw new PasswordPolicyError(
      `Password must be at least ${passwordConfig.minLength} characters long.`,
    );
  }

  if (passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
    throw new PasswordPolicyError(
      'Password must contain at least one uppercase letter.',
    );
  }

  if (passwordConfig.requireNumber && !/[0-9]/.test(password)) {
    throw new PasswordPolicyError(
      'Password must contain at least one numeric digit.',
    );
  }
}

// ── Hash & compare ────────────────────────────────────────────────────────────

/** Hashes a plaintext password using bcrypt with the configured salt rounds. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, passwordConfig.saltRounds);
}

/** Returns true if the plaintext matches the stored hash. */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
