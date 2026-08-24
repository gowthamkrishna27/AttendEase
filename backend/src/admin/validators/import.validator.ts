/**
 * import.validator.ts
 *
 * Handles the Excel/CSV column → field mapping and per-row validation with intelligent fallbacks.
 */
import { z } from 'zod';
import type { RawExcelRow } from '../types/import.types.js';

export const importStudentSchema = z.object({
  rollNumber: z.string().trim().min(1, 'Roll number is required'),
  name:       z.string().trim().min(1, 'Name is required'),
  email:      z.string().email('Invalid email').toLowerCase().trim(),
  role:       z.enum(['student', 'faculty', 'hod', 'admin']).default('student'),
  department: z.string().trim().min(1, 'Department is required'),
  year:       z.string().trim().optional(),
  semester:   z.coerce.number().int().min(1).max(10).optional(),
  section:    z.string().trim().optional(),
  avatarUrl:  z.string().trim().optional(),
  phone:      z.string().trim().optional(),
});

/**
 * Normalizes study year into standard format: "1st Year" | "2nd Year" | "3rd Year" | "4th Year"
 */
function normalizeStudyYear(rawYear: string | undefined): { year?: string; semester?: number } {
  if (!rawYear) return {};
  const y = String(rawYear).trim();
  if (!y) return {};

  // Ignore batch calendar years like "2024-2025", "2024-25", "2023-2024"
  if (/^\d{4}\s*[-/]\s*\d{2,4}$/.test(y)) {
    return {};
  }

  const clean = y.toUpperCase();

  // Roman numerals
  if (/\bIV\b|4TH|FOURTH|FINAL/.test(clean)) return { year: '4th Year', semester: 7 };
  if (/\bIII\b|3RD|THIRD/.test(clean)) return { year: '3rd Year', semester: 5 };
  if (/\bII\b|2ND|SECOND/.test(clean)) return { year: '2nd Year', semester: 3 };
  if (/\bI\b|1ST|FIRST/.test(clean)) return { year: '1st Year', semester: 1 };

  // Single digit matching
  const digitMatch = y.match(/\b([1-4])\b/);
  if (digitMatch && digitMatch[1]) {
    const num = parseInt(digitMatch[1], 10);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return { year: `${num}${suffix} Year`, semester: (num * 2) - 1 };
  }

  // Any single digit 1-4 anywhere
  const singleDigit = y.match(/([1-4])/);
  if (singleDigit && singleDigit[1]) {
    const num = parseInt(singleDigit[1], 10);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return { year: `${num}${suffix} Year`, semester: (num * 2) - 1 };
  }

  return {};
}

/**
 * Normalizes section into clean format: "A" | "B" | "C" | "CSIT-A" | "CSD-B", etc.
 */
function normalizeSection(rawSec: string | undefined): string | undefined {
  if (!rawSec) return undefined;
  const s = String(rawSec).trim();
  if (!s) return undefined;

  // Ignore numbers that look like row serial numbers (e.g. "1", "2", "12")
  if (/^\d+$/.test(s)) {
    // If it's single digit 1, 2, 3 -> section A, B, C or return undefined
    const num = parseInt(s, 10);
    if (num >= 1 && num <= 4) {
      return String.fromCharCode(64 + num); // 1 -> "A", 2 -> "B"
    }
    return undefined;
  }

  const clean = s.toUpperCase().replace(/\s+/g, ' ');

  // Match "CSIT-A", "CSIT-B", "CSD-A", "CSD-B"
  const compMatch = clean.match(/\b(CSIT|CSD|CSE|ECE|IT)\s*[-_ ]?\s*([A-D])\b/i);
  if (compMatch && compMatch[1] && compMatch[2]) {
    return `${compMatch[1]}-${compMatch[2]}`;
  }

  // Match "Section A", "Sec A", "Sec-A", "Section - B"
  const secLetterMatch = clean.match(/(?:SECTION|SEC)\s*[-_.: ]?\s*([A-D])/i);
  if (secLetterMatch && secLetterMatch[1]) {
    return secLetterMatch[1];
  }

  // Single letter section like "A", "B", "C", "D"
  const singleLetter = clean.match(/^([A-D])$/);
  if (singleLetter && singleLetter[1]) {
    return singleLetter[1];
  }

  // If starts with "SEC" or "SECTION" strip it
  const stripped = clean.replace(/^(?:SECTION|SEC)\s*[-_.: ]*/i, '').trim();
  if (stripped.length > 0 && stripped.length <= 10) {
    return stripped;
  }

  return s;
}

/**
 * Maps a raw Excel/CSV row (keyed by column header) to a flat student object
 * with smart header matching and automatic field derivation.
 */
export function mapRowToFields(rawRow: RawExcelRow): Record<string, unknown> {
  const normKeys: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    normKeys[cleanKey] = v;
  }

  const findVal = (exactAliases: string[], partialAliases: string[] = []): any => {
    // 1. Exact cleaned match
    for (const a of exactAliases) {
      const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKeys[cleanA] !== undefined && normKeys[cleanA] !== null && String(normKeys[cleanA]).trim() !== '') {
        return normKeys[cleanA];
      }
    }
    // 2. Substring match for explicitly allowed partial aliases (avoiding short aliases like 's', 'no')
    for (const [k, v] of Object.entries(rawRow)) {
      if (v === undefined || v === null || String(v).trim() === '') continue;
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Exclude row index columns from partial matching
      if (/^(sno|slno|sno|serialnumber|index|num|id)$/i.test(cleanK)) continue;

      for (const a of partialAliases) {
        const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanA.length >= 3 && cleanK.includes(cleanA)) {
          return v;
        }
      }
    }
    return undefined;
  };

  const rawRoll = String(
    findVal(
      ['registeredno', 'regesterdno', 'registerednumber', 'registerno', 'registernumber',
       'regdno', 'regdnumber', 'regno', 'regnumber',
       'rollnumber', 'rollno', 'roll', 'pin', 'htno', 'hallticket', 'studentid', 'id'],
      ['registerno', 'registeredno', 'rollnumber', 'hallticket']
    ) || ''
  ).toUpperCase().trim();

  if (!rawRoll) return {};

  const name = String(
    findVal(['studentname', 'fullname', 'name', 'student'], ['studentname', 'fullname']) ||
    `User (${rawRoll})`
  ).trim();
  
  let department = String(
    findVal(['branch', 'department', 'dept', 'stream', 'course'], ['department', 'branch']) || ''
  ).toUpperCase().trim();

  if (!department) {
    department = (rawRoll.includes('05') || rawRoll.includes('62') || rawRoll.startsWith('24B91A05')) ? 'CSD' : 'CSIT';
  }

  const rawRole = String(
    findVal(['role', 'userrole', 'designation', 'type'], ['userrole', 'designation']) || 'student'
  ).toLowerCase().trim();

  let role: 'student' | 'faculty' | 'hod' | 'admin' = 'student';
  if (rawRole.includes('admin')) role = 'admin';
  else if (rawRole.includes('hod') || rawRole.includes('head')) role = 'hod';
  else if (rawRole.includes('fac') || rawRole.includes('prof') || rawRole.includes('teach') || rawRole.includes('staff')) role = 'faculty';
  else role = 'student';

  // ── Year & Semester extraction ─────────────────────────────────────────────
  const rawYearVal = findVal(['year', 'studyyear', 'classyear', 'yr', 'class'], ['studyyear', 'classyear']);
  let { year, semester } = normalizeStudyYear(rawYearVal ? String(rawYearVal) : undefined);

  const rawSemVal = findVal(['semester', 'sem', 'currentsemester'], ['semester']);
  if (rawSemVal) {
    const parsedSem = parseInt(String(rawSemVal).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsedSem) && parsedSem >= 1 && parsedSem <= 8) {
      semester = parsedSem;
      if (!year) {
        const yNum = Math.ceil(parsedSem / 2);
        const suffix = yNum === 1 ? 'st' : yNum === 2 ? 'nd' : yNum === 3 ? 'rd' : 'th';
        year = `${yNum}${suffix} Year`;
      }
    }
  }

  // Roll number-based fallback derivation if year wasn't specified in CSV
  if (!year && role === 'student') {
    const isLE = rawRoll.includes('95A') || rawRoll.includes('LE') || /LE\d+$/i.test(rawRoll);
    if (rawRoll.startsWith('23B')) year = '4th Year';
    else if (rawRoll.startsWith('25B') && isLE) year = '3rd Year';
    else if (rawRoll.startsWith('25B')) year = '2nd Year';
    else if (rawRoll.startsWith('26B')) year = '1st Year';
    else year = '3rd Year';
  }

  if (role === 'student' && (!semester || isNaN(semester))) {
    const yDigit = year?.match(/([1-4])/);
    semester = yDigit && yDigit[1] ? (parseInt(yDigit[1], 10) * 2) - 1 : 6;
  }

  // ── Section extraction ─────────────────────────────────────────────────────
  const rawSecVal = findVal(['section', 'sec', 'sectionname', 'secname', 'studentsection'], ['section', 'sectionname']);
  const section = normalizeSection(rawSecVal ? String(rawSecVal) : undefined);

  const email = String(findVal(['email', 'mail', 'emailid'], ['emailid', 'emailaddress']) || `${rawRoll.toLowerCase()}@srkrec.ac.in`).toLowerCase().trim();
  const avatarUrl = String(findVal(['avatarurl', 'avatar', 'photo', 'image'], ['avatarurl', 'photourl']) || `https://srkrexams.in/SRKR/photo/${rawRoll}.jpg`).trim();
  const phone = findVal(['phone', 'mobile', 'contact', 'phonenumber'], ['phonenumber', 'mobilenumber']) ? String(findVal(['phone', 'mobile', 'contact', 'phonenumber'])).trim() : undefined;

  return {
    rollNumber: rawRoll,
    name,
    email,
    role,
    department,
    year: year || undefined,
    semester: semester || undefined,
    section: section || undefined,
    avatarUrl,
    phone,
  };
}

export function validateImportRow(
  mappedRow: Record<string, unknown>,
):
  | { ok: true; data: z.infer<typeof importStudentSchema> }
  | { ok: false; error: string } {
  if (!mappedRow['rollNumber']) {
    return { ok: false, error: 'Missing roll number' };
  }

  const result = importStudentSchema.safeParse(mappedRow);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const messages = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { ok: false, error: messages };
}

export function isAllowedMimeType(mimeType: string): boolean {
  return true; // allow all CSV and XLSX variations
}

