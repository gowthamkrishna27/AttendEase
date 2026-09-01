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

export function sortRolls(rolls: string[]): string[] {
  return [...rolls].sort((a, b) => {
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
  students: Array<{
    userId: string;
    name: string;
    rollNumber: string;
    suffix: string;
  }>;
}

/**
 * Returns the canonical roster for the specified academic year.
 * ALL 3 canonical sections (CSIT-A, CSIT-B, CSD-A) are ALWAYS returned for all 4 years.
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

  // Initialize roster containers for ALL 3 CANONICAL SECTIONS
  const rosterMap = new Map<CanonicalSectionId, {
    rollNumbers: Set<string>;
    students: Array<{ userId: string; name: string; rollNumber: string; suffix: string }>;
  }>();

  for (const cs of CANONICAL_SECTIONS) {
    rosterMap.set(cs.id, {
      rollNumbers: new Set<string>(),
      students: [],
    });
  }

  // Populate students into their canonical section based on their actual database records
  // STRICT RULE: Never infer section from roll number.
  for (const s of yearStudents) {
    const canonicalId = normalizeToCanonicalSection(s.department, s.section);
    if (!canonicalId || !rosterMap.has(canonicalId)) continue;

    const rawRoll = (s.rollNumber || s.userId || '').trim();
    const suffix = extractRollSuffix(rawRoll);
    const entry = rosterMap.get(canonicalId)!;

    if (suffix) {
      entry.rollNumbers.add(suffix);
    }
    entry.students.push({
      userId: s.userId,
      name: s.name,
      rollNumber: rawRoll,
      suffix,
    });
  }

  // Build final result containing ALL canonical sections (even if empty)
  const sections: SectionRosterItem[] = CANONICAL_SECTIONS.map(cs => {
    const entry = rosterMap.get(cs.id)!;
    const sortedRolls = sortRolls(Array.from(entry.rollNumbers));
    return {
      id: cs.id,
      key: cs.displayName,
      value: cs.id,
      label: cs.shortLabel,
      displayName: cs.displayName,
      department: cs.department,
      section: cs.section,
      year: yearLabel,
      rollNumbers: sortedRolls,
      studentCount: entry.students.length,
      students: entry.students,
    };
  });

  return {
    year: yearLabel,
    sections,
  };
}
