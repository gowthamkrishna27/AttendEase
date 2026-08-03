/**
 * import.types.ts
 * Types for the bulk Excel/CSV import feature.
 */

import type { CreateStudentBody } from './student.types.js';

// ── Per-row result tracking ───────────────────────────────────────────────────

/** A row that failed validation or was skipped due to a duplicate */
export interface ImportRowError {
  /** 1-indexed row number in the uploaded file (including header) */
  row:          number;
  /** Roll number from the row, if it could be parsed */
  rollNumber?:  string;
  /** Human-readable reason for failure or skip */
  reason:       string;
}

// ── Final import result returned to the caller ────────────────────────────────

export interface ImportReport {
  /** Number of rows successfully inserted into the database */
  inserted: number;
  /** Number of rows skipped because they already exist (only when strategy=skip) */
  skipped:  number;
  /** Number of rows updated in-place (only when strategy=upsert) */
  upserted: number;
  /** Rows that failed validation or processing — includes both failed and skipped rows */
  failed:   ImportRowError[];
}

// ── Parsed row before validation ──────────────────────────────────────────────

/** Raw values extracted from one Excel row — all strings before coercion */
export type RawExcelRow = Record<string, string | number | boolean | null | undefined>;

/** A fully validated row ready for DB insertion */
export type ValidatedStudentRow = CreateStudentBody;
