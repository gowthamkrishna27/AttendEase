/**
 * admin.config.ts
 *
 * Single source of truth for all admin-module runtime configuration.
 * Business logic imports from here — never from process.env directly.
 * Any misconfiguration (missing required var) throws at startup, not silently
 * at runtime.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer, got: "${raw}"`);
  return parsed;
}

function getEnvBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

function getEnvEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = process.env[key] as T | undefined;
  if (!raw) return fallback;
  if (!allowed.includes(raw)) {
    throw new Error(`Environment variable ${key} must be one of [${allowed.join(', ')}], got: "${raw}"`);
  }
  return raw;
}

// ── Password policy ───────────────────────────────────────────────────────────

export const passwordConfig = {
  /** bcrypt salt rounds — higher = slower but more secure */
  saltRounds: getEnvNumber('BCRYPT_SALT_ROUNDS', 12),

  /** Minimum character length for any password */
  minLength: getEnvNumber('PASSWORD_MIN_LENGTH', 8),

  /** Whether passwords must contain at least one uppercase letter */
  requireUppercase: getEnvBoolean('PASSWORD_REQUIRE_UPPERCASE', true),

  /** Whether passwords must contain at least one numeric digit */
  requireNumber: getEnvBoolean('PASSWORD_REQUIRE_NUMBER', true),
} as const;

// ── Excel / CSV import ────────────────────────────────────────────────────────

const DUPLICATE_STRATEGIES = ['skip', 'upsert'] as const;
export type DuplicateStrategy = (typeof DUPLICATE_STRATEGIES)[number];

export const importConfig = {
  /** Maximum upload file size in bytes */
  maxFileSizeBytes: getEnvNumber('MAX_IMPORT_FILE_SIZE_MB', 10) * 1024 * 1024,

  /** What to do when an imported row's roll number already exists in the DB */
  duplicateStrategy: getEnvEnum('IMPORT_DUPLICATE_STRATEGY', DUPLICATE_STRATEGIES, 'skip'),

  /**
   * Column-name → field-name mapping.
   * Keys are exact Excel column headers (case-insensitive match applied at parse time).
   * Values are the corresponding CreateStudentBody field names.
   *
   * To change the expected Excel template, update this map here — nowhere else.
   */
  excelColumnMap: {
    'Roll Number': 'rollNumber',
    'Full Name':   'name',
    'Email':       'email',
    'Department':  'department',
    'Semester':    'semester',
    'Gender':      'gender',
    'Avatar URL':  'avatarUrl',   // optional column
  } as const satisfies Record<string, string>,

  /** Allowed MIME types for upload */
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv',
    'application/csv',
  ] as const,
} as const;

// ── Pagination defaults ───────────────────────────────────────────────────────

export const paginationConfig = {
  defaultPage:     1,
  defaultPageSize: 20,
  maxPageSize:     100,
} as const;

// Eagerly validate all required vars at module load time (not request time)
void requireEnv('JWT_SECRET'); // already used in auth middleware; revalidate here to fail fast
