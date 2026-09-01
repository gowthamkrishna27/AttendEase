export type CanonicalSectionId = 'CSIT-A' | 'CSIT-B' | 'CSD-A';

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
    id: 'CSD-A',
    department: 'CSD',
    section: 'A',
    displayName: 'CSD — Section A',
    shortLabel: 'CSD - Sec A',
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

  // If already exactly a canonical ID
  if (sec === 'CSIT-A') return 'CSIT-A';
  if (sec === 'CSIT-B') return 'CSIT-B';
  if (sec === 'CSD-A') return 'CSD-A';

  // Normalize section letter
  const cleanSec = sec
    .replace(/SECTION/g, '')
    .replace(/SEC/g, '')
    .replace(/[-_—–\s]/g, '')
    .trim();

  // CSD Department
  if (dept.includes('CSD')) {
    // All CSD students belong to CSD-A
    return 'CSD-A';
  }

  // CSIT Department
  if (dept.includes('CSIT') || dept.includes('IT')) {
    if (cleanSec === 'B' || cleanSec.endsWith('B')) {
      return 'CSIT-B';
    }
    // Default to A if A or empty
    return 'CSIT-A';
  }

  // Fallback checks on section string itself
  if (sec.includes('CSD')) return 'CSD-A';
  if (sec.includes('CSIT')) {
    return (cleanSec === 'B' || cleanSec.endsWith('B')) ? 'CSIT-B' : 'CSIT-A';
  }

  if (cleanSec === 'B') return 'CSIT-B';
  return 'CSIT-A';
}

export function getCanonicalSection(id: string): CanonicalSectionConfig | undefined {
  return CANONICAL_SECTIONS.find(s => s.id === id);
}
