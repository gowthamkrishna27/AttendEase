/**
 * import.service.ts
 *
 * Orchestrates the bulk Excel/CSV import pipeline:
 *   1. Stream-parse the uploaded file with ExcelJS (no full-array memory load)
 *   2. Map each row's columns using the configured column map
 *   3. Validate every row against the canonical student Zod schema
 *   4. Batch-insert all valid rows in a single DB operation
 *   5. Return a detailed ImportReport (inserted / skipped / failed counts + per-row errors)
 *
 * No column names or magic numbers are hardcoded here — all come from admin.config.ts.
 */
import ExcelJS from 'exceljs';
import { importConfig } from '../config/admin.config.js';
import { mapRowToFields, validateImportRow } from '../validators/import.validator.js';
import * as studentRepo from '../repositories/prisma/student.repository.prisma.js';
import { hashPassword } from './password.service.js';
import type { ImportReport, ImportRowError, RawExcelRow } from '../types/import.types.js';
import type { CreateStudentBody } from '../types/student.types.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function toUserId(rollNumber: string): string {
  return `stu-${rollNumber}`;
}

/**
 * Converts ExcelJS cell values (which can be complex objects) to primitives
 * that can be safely passed through the Zod validator.
 */
function normaliseCellValue(
  raw: ExcelJS.CellValue,
): string | number | boolean | null | undefined {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }
  // RichText, Error, Hyperlink — convert to string
  if (typeof raw === 'object' && 'text' in (raw as object)) {
    return String((raw as { text: unknown }).text);
  }
  return String(raw);
}

// ── Main import function ──────────────────────────────────────────────────────

/**
 * Processes an in-memory file buffer and inserts valid student rows into the DB.
 *
 * @param buffer - The raw uploaded file bytes (xlsx or csv)
 * @returns ImportReport with inserted/skipped/failed counts and per-row error details
 */
export async function importStudentsFromBuffer(buffer: Buffer): Promise<ImportReport> {
  const validRows:   Array<CreateStudentBody & { userId: string; password: string }> = [];
  const failedRows:  ImportRowError[] = [];
  const skippedRows: ImportRowError[] = [];

  // ── Step 1: Stream-parse the workbook ──────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  // Convert to ArrayBuffer — avoids Buffer<ArrayBufferLike> vs Buffer<ArrayBuffer> mismatch
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(arrayBuffer as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { inserted: 0, skipped: 0, upserted: 0, failed: [{ row: 0, reason: 'The uploaded file contains no worksheets.' }] };
  }

  // Read header row (row 1)
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colIndex) => {
    headers[colIndex] = String(cell.value ?? '').trim();
  });

  // ── Step 2: Parse data rows ────────────────────────────────────────────────
  const dataRows: Array<{ rowIndex: number; raw: RawExcelRow }> = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return; // skip header

    const rawRow: RawExcelRow = {};
    row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      const header = headers[colIndex];
      if (header) {
        rawRow[header] = normaliseCellValue(cell.value);
      }
    });

    // Skip completely empty rows
    const hasAnyValue = Object.values(rawRow).some(
      (v) => v !== null && v !== undefined && v !== '',
    );
    if (hasAnyValue) {
      dataRows.push({ rowIndex, raw: rawRow });
    }
  });

  if (dataRows.length === 0) {
    return { inserted: 0, skipped: 0, upserted: 0, failed: [{ row: 0, reason: 'The worksheet contains no data rows.' }] };
  }

  // ── Step 3: Validate each row ──────────────────────────────────────────────
  for (const { rowIndex, raw } of dataRows) {
    const mapped = mapRowToFields(raw);
    const result = validateImportRow(mapped);

    if (!result.ok) {
      failedRows.push({ row: rowIndex, rollNumber: String(mapped['rollNumber'] ?? ''), reason: result.error });
      continue;
    }

    validRows.push({
      ...result.data,
      userId:   toUserId(result.data.rollNumber),
      password: '', // placeholder — will be replaced with hashed password below
    });
  }

  if (validRows.length === 0) {
    return { inserted: 0, skipped: 0, upserted: 0, failed: failedRows };
  }

  // ── Step 4: Hash passwords (default = roll number) and check duplicates ────
  const rollNumbers   = validRows.map((r) => r.rollNumber);
  const existingRolls = await studentRepo.findExistingRollNumbers(rollNumbers);

  const toInsert:  typeof validRows = [];
  const toUpsert:  typeof validRows = [];

  await Promise.all(
    validRows.map(async (row) => {
      const hashedPassword = await hashPassword(row.rollNumber);
      const rowWithHash    = { ...row, password: hashedPassword };

      const isDuplicate = existingRolls.has(row.rollNumber.toLowerCase());

      if (isDuplicate) {
        if (importConfig.duplicateStrategy === 'upsert') {
          toUpsert.push(rowWithHash);
        } else {
          skippedRows.push({
            row: rollNumbers.indexOf(row.rollNumber) + 2, // +2: 1-indexed + header
            rollNumber: row.rollNumber,
            reason: 'Duplicate roll number (skipped — existing record preserved)',
          });
        }
      } else {
        toInsert.push(rowWithHash);
      }
    }),
  );

  // ── Step 5: Bulk insert new rows ───────────────────────────────────────────
  let insertedCount  = 0;
  let upsertedCount  = 0;

  if (toInsert.length > 0) {
    insertedCount = await studentRepo.bulkInsertStudents(toInsert);
  }

  // ── Step 6: Upsert existing rows (only when strategy=upsert) ──────────────
  if (toUpsert.length > 0) {
    await Promise.all(
      toUpsert.map((row) => studentRepo.upsertStudentByRollNumber(row)),
    );
    upsertedCount = toUpsert.length;
  }

  return {
    inserted: insertedCount,
    skipped:  skippedRows.length,
    upserted: upsertedCount,
    failed:   [...failedRows, ...skippedRows],
  };
}
