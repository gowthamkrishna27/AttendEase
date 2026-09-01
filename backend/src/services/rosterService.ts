import { prisma } from '../db/prisma.js';
import {
  CANONICAL_SECTIONS,
  CanonicalSectionId,
  normalizeToCanonicalSection,
} from '../constants/canonicalSections.js';

export function extractRollSuffix(rawRoll: string): string {
  if (!rawRoll) return '';
  const str = rawRoll.trim().toUpperCase();

  const leMatch = str.match(/LE0*([1-9]|1[0-3])$/i);
  if (leMatch) {
    return `LE${parseInt(leMatch[1], 10)}`;
  }

  if (str.includes('95A')) {
    const numMatch = str.match(/(\d{1,2})$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 30) {
        return `LE${num}`;
      }
    }
  }

  const suffixMatch = str.match(/([A-D][0-9]|[0-9]{1,2})$/i);
  if (suffixMatch) {
    const val = suffixMatch[1];
    if (/^\d+$/.test(val)) {
      return String(parseInt(val, 10));
    }
    return val;
  }
  return str;
}

export function extractStudentBatchPrefix(rawRoll: string): string | null {
  if (!rawRoll) return null;
  const match = rawRoll.trim().match(/^(\d{2})B/i);
  return match ? match[1] : null;
}

export function getExpectedBatchYear(targetDigit: string): string {
  const map: Record<string, string> = {
    '1': '26',
    '2': '25',
    '3': '24',
    '4': '23',
  };
  return map[targetDigit] || '24';
}

/**
 * Sorts roll numbers adhering to the canonical roster ordering rules:
 * 1. Prefixed / detained disambiguated rolls (e.g. '23-62') appear FIRST before normal sequence.
 * 2. Pure numeric rolls ('1' through '72+') appear in ascending numeric order.
 * 3. Lateral entry rolls ('LE1' through 'LE13+') appear after numeric rolls.
 * 4. Other alphanumeric rolls ('A0', 'B1', etc.) sorted naturally.
 */
export function sortRolls(rolls: string[]): string[] {
  return [...rolls].sort((a, b) => {
    const isPrefixedA = /^\d{2}-.+$/.test(a);
    const isPrefixedB = /^\d{2}-.+$/.test(b);

    if (isPrefixedA && isPrefixedB) {
      const [batchA, suffixA] = a.split('-');
      const [batchB, suffixB] = b.split('-');
      const numBatchA = parseInt(batchA || '0', 10);
      const numBatchB = parseInt(batchB || '0', 10);
      if (numBatchA !== numBatchB) return numBatchA - numBatchB;
      const isNumSufA = /^\d+$/.test(suffixA || '');
      const isNumSufB = /^\d+$/.test(suffixB || '');
      if (isNumSufA && isNumSufB) {
        return parseInt(suffixA!, 10) - parseInt(suffixB!, 10);
      }
      return (suffixA || '').localeCompare(suffixB || '', undefined, { numeric: true });
    }
    if (isPrefixedA) return -1;
    if (isPrefixedB) return 1;

    const isNumA = /^\d+$/.test(a);
    const isNumB = /^\d+$/.test(b);
    if (isNumA && isNumB) return parseInt(a, 10) - parseInt(b, 10);
    if (isNumA) return -1;
    if (isNumB) return 1;

    const isLeA = /^LE\d+$/i.test(a);
    const isLeB = /^LE\d+$/i.test(b);
    if (isLeA && isLeB) {
      const numA = parseInt(a.replace(/LE/i, ''), 10);
      const numB = parseInt(b.replace(/LE/i, ''), 10);
      return numA - numB;
    }
    if (isLeA) return 1;
    if (isLeB) return -1;

    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export interface SectionStudentItem {
  userId: string;
  name: string;
  rollNumber: string;
  displayRoll: string;
  suffix: string;
  isColliding: boolean;
}

export interface SectionRosterItem {
  id: CanonicalSectionId;
  key: string;
  value: string;
  label: string;
  displayName: string;
  department: 'CSIT' | 'CSD';
  section: 'A' | 'B';
  year: string;
  rollNumbers: string[];
  studentCount: number;
  students: SectionStudentItem[];
}

/**
 * Returns the canonical roster for the specified academic year.
 * ALL 3 canonical sections (CSIT-A, CSIT-B, CSD) are ALWAYS returned for all 4 years.
 * Empty sections return rollNumbers: [] and students: [] (studentCount: 0).
 */
export async function getCanonicalRosterForYear(yearQuery?: string): Promise<{
  year: string;
  sections: SectionRosterItem[];
}> {
  const targetYear = (typeof yearQuery === 'string' && yearQuery.trim() && yearQuery !== 'all')
    ? yearQuery.trim().toLowerCase()
    : '3rd year';

  const targetDigitMatch = targetYear.match(/([1-4])/);
  const targetDigit = targetDigitMatch ? targetDigitMatch[1] : '3';
  const yearLabel = `${targetDigit}${targetDigit === '1' ? 'st' : targetDigit === '2' ? 'nd' : targetDigit === '3' ? 'rd' : 'th'} Year`;
  const expectedBatch = getExpectedBatchYear(targetDigit);

  // Fetch all active student users from DB
  const allStudents = await prisma.user.findMany({
    where: {
      role: 'student',
      isActive: true,
    },
    select: {
      userId: true,
      name: true,
      rollNumber: true,
      department: true,
      year: true,
      section: true,
      semester: true,
    },
    orderBy: { rollNumber: 'asc' },
  });

  // Filter students strictly belonging to the requested academic year
  const yearStudents = allStudents.filter(s => {
    if (s.year) {
      const match = s.year.match(/([1-4])/);
      if (match) return match[1] === targetDigit;
    }
    if (s.semester && typeof s.semester === 'number') {
      return String(Math.ceil(s.semester / 2)) === targetDigit;
    }
    const roll = (s.rollNumber || '').toUpperCase();
    const isLateral = roll.includes('95A') || roll.includes('LE') || /LE\d+$/i.test(roll);

    if (targetDigit === '3') return roll.startsWith('24B') || (roll.startsWith('25B') && isLateral);
    if (targetDigit === '2') return roll.startsWith('25B') && !isLateral;
    if (targetDigit === '1') return roll.startsWith('26B') && !isLateral;
    if (targetDigit === '4') return roll.startsWith('23B') || (roll.startsWith('24B') && isLateral);
    return false;
  });

  // Initialize raw student buckets for ALL 3 CANONICAL SECTIONS
  const sectionStudentsMap = new Map<CanonicalSectionId, Array<{
    userId: string;
    name: string;
    rollNumber: string;
    suffix: string;
    batch: string | null;
  }>>();

  for (const cs of CANONICAL_SECTIONS) {
    sectionStudentsMap.set(cs.id, []);
  }

  // Group actual database students into their canonical section based on explicit record
  // STRICT RULE: Never infer section from roll number.
  for (const s of yearStudents) {
    const canonicalId = normalizeToCanonicalSection(s.department, s.section);
    if (!canonicalId || !sectionStudentsMap.has(canonicalId)) continue;

    const rawRoll = (s.rollNumber || s.userId || '').trim();
    const suffix = extractRollSuffix(rawRoll);
    const batch = extractStudentBatchPrefix(rawRoll);

    sectionStudentsMap.get(canonicalId)!.push({
      userId: s.userId,
      name: s.name,
      rollNumber: rawRoll,
      suffix,
      batch,
    });
  }

  // Process collision detection and display identifier assignment per section
  const sections: SectionRosterItem[] = CANONICAL_SECTIONS.map(cs => {
    const rawStudents = sectionStudentsMap.get(cs.id)!;

    // Count occurrences of each base suffix in this section
    const suffixFrequency = new Map<string, number>();
    for (const st of rawStudents) {
      if (st.suffix) {
        suffixFrequency.set(st.suffix, (suffixFrequency.get(st.suffix) || 0) + 1);
      }
    }

    // Resolve display identifiers for all students in section
    const resolvedStudents: SectionStudentItem[] = rawStudents.map(st => {
      const hasCollision = (suffixFrequency.get(st.suffix) || 0) > 1;
      let displayRoll = st.suffix;

      if (hasCollision && st.batch) {
        // If student is from a different/earlier batch than regular expected batch, prepend batch
        if (st.batch !== expectedBatch) {
          displayRoll = `${st.batch}-${st.suffix}`;
        }
      }

      return {
        userId: st.userId,
        name: st.name,
        rollNumber: st.rollNumber,
        displayRoll,
        suffix: st.suffix,
        isColliding: hasCollision,
      };
    });

    // Secondary safety: ensure no two students share the same displayRoll
    const seenDisplayRolls = new Set<string>();
    for (const st of resolvedStudents) {
      if (seenDisplayRolls.has(st.displayRoll)) {
        const batch = extractStudentBatchPrefix(st.rollNumber);
        if (batch && !st.displayRoll.startsWith(`${batch}-`)) {
          st.displayRoll = `${batch}-${st.suffix}`;
        }
      }
      seenDisplayRolls.add(st.displayRoll);
    }

    // Sort students by their displayRoll adhering to canonical ordering rules
    resolvedStudents.sort((a, b) => {
      const sorted = sortRolls([a.displayRoll, b.displayRoll]);
      return sorted[0] === a.displayRoll ? -1 : 1;
    });

    const displayRollNumbers = resolvedStudents.map(s => s.displayRoll);

    return {
      id: cs.id,
      key: cs.displayName,
      value: cs.id,
      label: cs.shortLabel,
      displayName: cs.displayName,
      department: cs.department,
      section: cs.section,
      year: yearLabel,
      rollNumbers: displayRollNumbers,
      studentCount: resolvedStudents.length,
      students: resolvedStudents,
    };
  });

  return {
    year: yearLabel,
    sections,
  };
}
