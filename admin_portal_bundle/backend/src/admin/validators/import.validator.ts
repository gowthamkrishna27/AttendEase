/**
 * import.validator.ts
 *
 * Handles the Excel/CSV column → field mapping and per-row validation.
 *
 * Column-name-to-field mapping comes from importConfig.excelColumnMap in
 * admin.config.ts — never hardcoded here. Row validation delegates entirely to
 * createStudentSchema so the rules stay in one place.
 */
import { z } from 'zod';
import { importConfig } from '../config/admin.config.js';
import { createStudentSchema } from './student.validator.js';
import type { RawExcelRow } from '../types/import.types.js';

// Column map is read from config — this file never hardcodes header names
const columnMap = importConfig.excelColumnMap;

/**
 * Maps a raw Excel row (keyed by column header) to a flat object keyed by
 * our internal field names, using a case-insensitive header match.
 *
 * Returns null for a column if the header is not found in the row.
 */
export function mapRowToFields(rawRow: RawExcelRow): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [header, fieldName] of Object.entries(columnMap)) {
    // Case-insensitive lookup against the raw row keys
    const matchedKey = Object.keys(rawRow).find(
      (k) => k.trim().toLowerCase() === header.toLowerCase(),
    );
    mapped[fieldName] = matchedKey !== undefined ? rawRow[matchedKey] : undefined;
  }

  // semester may come in as a string from Excel — coerce to number for Zod
  if (typeof mapped['semester'] === 'string') {
    const parsed = parseInt(mapped['semester'] as string, 10);
    mapped['semester'] = isNaN(parsed) ? mapped['semester'] : parsed;
  }

  return mapped;
}

/**
 * Validates a mapped row object against the canonical student creation schema.
 * Returns a discriminated-union result: { ok: true, data } or { ok: false, error }.
 */
export function validateImportRow(
  mappedRow: Record<string, unknown>,
):
  | { ok: true; data: z.infer<typeof createStudentSchema> }
  | { ok: false; error: string } {
  const result = createStudentSchema.safeParse(mappedRow);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const messages = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { ok: false, error: messages };
}

/**
 * Validates the uploaded file's MIME type against the allowlist in config.
 * Returns true if the type is acceptable.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return (importConfig.allowedMimeTypes as readonly string[]).includes(mimeType);
}
