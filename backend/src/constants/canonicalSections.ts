export type CanonicalSectionId = 'CSIT-A' | 'CSIT-B' | 'CSD';

export interface CanonicalSectionConfig {
  id: CanonicalSectionId;
  department: 'CSIT' | 'CSD';
  section: 'A' | 'B';
  displayName: string;
  shortLabel: string;
}

export const CANONICAL_SECTIONS: readonly CanonicalSectionConfig[] = [
  {
    id: 'CSIT-A',
    department: 'CSIT',
    section: 'A',
    displayName: 'CSIT — Section A',
    shortLabel: 'CSIT - Sec A',
  },
  {
    id: 'CSIT-B',
    department: 'CSIT',
    section: 'B',
    displayName: 'CSIT — Section B',
    shortLabel: 'CSIT - Sec B',
  },
  {
    id: 'CSD',
    department: 'CSD',
    section: 'A',
    displayName: 'CSD',
    shortLabel: 'CSD',
  },
] as const;

export const VALID_ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
] as const;

export type AcademicYear = typeof VALID_ACADEMIC_YEARS[number];

/**
 * Normalizes any stored department and section value to a canonical section ID.
 * STRICT RULE: Never infers section from roll number.
 */
export function normalizeToCanonicalSection(
  department?: string | null,
  rawSection?: string | null
): CanonicalSectionId | null {
  const dept = (department || '').trim().toUpperCase();
  const sec = (rawSection || '').trim().toUpperCase();

  if (!sec) return null;

  // If already exactly a canonical ID
  if (sec === 'CSIT-A') return 'CSIT-A';
  if (sec === 'CSIT-B') return 'CSIT-B';
  if (sec === 'CSD' || sec === 'CSD-A') return 'CSD';

  // Normalize section letter
  const cleanSec = sec
    .replace(/SECTION/g, '')
    .replace(/SEC/g, '')
    .replace(/[-_—–\s]/g, '')
    .trim();

  // CSD Department or CSD section indicator
  if (dept.includes('CSD') || sec.includes('CSD')) {
    return 'CSD';
  }

  // CSIT Department or CSIT section indicator
  if (dept.includes('CSIT') || dept.includes('IT') || sec.includes('CSIT')) {
    if (cleanSec === 'B' || cleanSec.endsWith('B')) {
      return 'CSIT-B';
    }
    if (cleanSec === 'A' || cleanSec.endsWith('A') || !cleanSec) {
      return 'CSIT-A';
    }
    return null;
  }

  // Fallback checks if department is not provided or other
  if (cleanSec === 'B' || cleanSec.endsWith('B')) return 'CSIT-B';
  if (cleanSec === 'A' || cleanSec.endsWith('A')) return 'CSIT-A';

  return null;
}

/**
 * Canonical section normalization function with flexible argument order.
 * Supports:
 *   toCanonicalSection(department, rawSection)
 *   toCanonicalSection(rawSection, rollNumber, department)
 *   toCanonicalSection(rawSection, department)
 *   toCanonicalSection(rawSection)
 */
export function toCanonicalSection(
  arg1?: string | null,
  arg2?: string | null,
  arg3?: string | null
): CanonicalSectionId | null {
  // 3 arguments: (rawSection, rollNumber, department)
  if (arg3 !== undefined) {
    return normalizeToCanonicalSection(arg3, arg1);
  }
  // 2 arguments: check if arg1 is department or rawSection
  const a1 = (arg1 || '').trim().toUpperCase();
  const a2 = (arg2 || '').trim().toUpperCase();
  if (a1 === 'CSIT' || a1 === 'CSD' || a1.includes('DEPARTMENT')) {
    return normalizeToCanonicalSection(arg1, arg2);
  }
  if (a2 === 'CSIT' || a2 === 'CSD' || a2.includes('DEPARTMENT')) {
    return normalizeToCanonicalSection(arg2, arg1);
  }
  // Fallback: (department, rawSection)
  return normalizeToCanonicalSection(arg1, arg2);
}

export function getCanonicalSection(id: string): CanonicalSectionConfig | undefined {
  return CANONICAL_SECTIONS.find(s => s.id === id);
}
