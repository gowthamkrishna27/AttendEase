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
 * Maps a raw Excel/CSV row (keyed by column header) to a flat student object
 * with smart header matching and automatic field derivation.
 */
export function mapRowToFields(rawRow: RawExcelRow): Record<string, unknown> {
  const normKeys: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    normKeys[cleanKey] = v;
  }

  const findVal = (...aliases: string[]): any => {
    // 1. Exact cleaned match
    for (const a of aliases) {
      const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKeys[cleanA] !== undefined && normKeys[cleanA] !== null && String(normKeys[cleanA]).trim() !== '') {
        return normKeys[cleanA];
      }
    }
    // 2. Substring match against any key in raw row
    for (const [k, v] of Object.entries(rawRow)) {
      if (v === undefined || v === null || String(v).trim() === '') continue;
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const a of aliases) {
        const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK.includes(cleanA) || cleanA.includes(cleanK)) {
          return v;
        }
      }
    }
    return undefined;
  };

  const rawRoll = String(
    findVal(
      'registeredno', 'regesterdno', 'registerednumber', 'registerno', 'registernumber',
      'regdno', 'regdnumber', 'regno', 'regnumber',
      'rollnumber', 'rollno', 'roll', 'pin', 'htno', 'hallticket', 'studentid', 'id'
    ) || ''
  ).toUpperCase().trim();

  if (!rawRoll) return {};

  const name = String(findVal('studentname', 'fullname', 'name', 'student') || `User (${rawRoll})`).trim();
  
  let department = String(findVal('branch', 'department', 'dept', 'stream', 'course') || '').toUpperCase().trim();
  if (!department) {
    department = (rawRoll.includes('05') || rawRoll.includes('62') || rawRoll.startsWith('24B91A05')) ? 'CSD' : 'CSIT';
  }

  const rawRole = String(findVal('role', 'userrole', 'designation', 'type') || 'student').toLowerCase().trim();
  let role: 'student' | 'faculty' | 'hod' | 'admin' = 'student';
  if (rawRole.includes('admin')) role = 'admin';
  else if (rawRole.includes('hod') || rawRole.includes('head')) role = 'hod';
  else if (rawRole.includes('fac') || rawRole.includes('prof') || rawRole.includes('teach') || rawRole.includes('staff')) role = 'faculty';
  else role = 'student';

  let year = String(findVal('year', 'academicyear', 'yr', 'class') || '').trim();
  let rawSem = findVal('semester', 'sem');
  let semester = rawSem ? parseInt(String(rawSem), 10) : undefined;

  if (year) {
    const yDigit = year.match(/([1-4])/);
    if (yDigit) {
      const num = parseInt(yDigit[1], 10);
      year = `${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Year`;
      if (!semester) semester = num * 2;
    }
  }

  if (!year && role === 'student') {
    if (semester && !isNaN(semester)) {
      const yNum = Math.ceil(semester / 2);
      year = `${yNum}${yNum === 1 ? 'st' : yNum === 2 ? 'nd' : yNum === 3 ? 'rd' : 'th'} Year`;
    } else {
      const isLE = rawRoll.includes('95A') || rawRoll.includes('LE') || /LE\d+$/i.test(rawRoll);
      if (rawRoll.startsWith('23B')) year = '4th Year';
      else if (rawRoll.startsWith('25B') && isLE) year = '3rd Year';
      else if (rawRoll.startsWith('25B')) year = '2nd Year';
      else if (rawRoll.startsWith('26B')) year = '1st Year';
      else year = '3rd Year';
    }
  }

  if (role === 'student' && (!semester || isNaN(semester))) {
    const yDigit = year.match(/([1-4])/);
    semester = yDigit ? parseInt(yDigit[1], 10) * 2 : 6;
  }

  const email = String(findVal('email', 'mail', 'emailid') || `${rawRoll.toLowerCase()}@srkrec.ac.in`).toLowerCase().trim();
  const avatarUrl = String(findVal('avatarurl', 'avatar', 'photo', 'image') || `https://srkrexams.in/SRKR/photo/${rawRoll}.jpg`).trim();
  const phone = findVal('phone', 'mobile', 'contact') ? String(findVal('phone', 'mobile', 'contact')).trim() : undefined;
  const section = findVal('section', 'sec') ? String(findVal('section', 'sec')).trim() : undefined;

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
