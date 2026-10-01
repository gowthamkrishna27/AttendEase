import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM");
  } catch {
    return dateStr;
  }
}

export function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatSubmittedAt(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = dateStr instanceof Date ? dateStr : parseISO(String(dateStr));
    if (isNaN(d.getTime())) {
      const fallback = new Date(dateStr as any);
      if (!isNaN(fallback.getTime())) {
        return format(fallback, "dd MMM yyyy, hh:mm a");
      }
      return String(dateStr);
    }
    return format(d, "dd MMM yyyy, hh:mm a");
  } catch {
    return String(dateStr) || '';
  }
}

export function formatTime(time: string | undefined | null): string {
  if (!time || typeof time !== 'string') return '';
  const str = time.trim();
  if (!str) return '';

  try {
    // 1. Check if time already contains AM/PM (e.g. "09:00 AM", "9:00am", "4 PM")
    const ampmMatch = str.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|am|pm)$/i);
    if (ampmMatch) {
      const h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const period = ampmMatch[3].toUpperCase();
      const displayH = h % 12 || 12;
      const displayM = String(isNaN(m) ? 0 : m).padStart(2, '0');
      return `${displayH}:${displayM} ${period}`;
    }

    // 2. Check if 24-hr time format "HH:MM" or "HH:MM:SS" (e.g. "09:00", "16:30")
    const match24 = str.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${period}`;
      }
    }

    // 3. Fallback: extract hours and optional minutes if string has format issues
    const fallbackMatch = str.match(/^(\d{1,2})/);
    if (fallbackMatch) {
      const hours = parseInt(fallbackMatch[1], 10);
      const period = str.toUpperCase().includes('PM') || hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:00 ${period}`;
    }
  } catch {
    // ignore
  }

  return str.replace(/NaN/gi, '00');
}

export const PERIOD_SLOTS = [
  { id: 1, label: 'Period 1', start: '09:00', end: '09:45' },
  { id: 2, label: 'Period 2', start: '09:45', end: '10:30' },
  { id: 3, label: 'Period 3', start: '10:30', end: '11:15' },
  { id: 4, label: 'Period 4', start: '11:15', end: '12:00' },
  { id: 5, label: 'Period 5', start: '13:30', end: '14:15' },
  { id: 6, label: 'Period 6', start: '14:15', end: '15:00' },
  { id: 7, label: 'Period 7', start: '15:00', end: '15:45' },
  { id: 8, label: 'Period 8', start: '15:45', end: '16:30' },
];

/**
 * Parse a period string (e.g. "1,2", "1-4", "3") or startTime/endTime range
 * into an array of period numbers [1, 2, 3, 4].
 */
export function getPeriodsFromRequest(req: { periods?: string | null; startTime?: string; endTime?: string }): number[] {
  if (!req) return [1, 2, 3, 4, 5, 6, 7, 8];

  // 1. Try parsing explicit periods string if provided
  if (req.periods) {
    const trimmed = String(req.periods).trim();
    if (trimmed.includes(',')) {
      const nums = trimmed.split(',').map(s => parseInt(s.replace(/\D/g, ''), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 8);
      if (nums.length > 0) return [...new Set(nums)].sort((a, b) => a - b);
    }
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      const start = parseInt(parts[0].replace(/\D/g, ''), 10);
      const end = parseInt(parts[1].replace(/\D/g, ''), 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= start) {
        const arr: number[] = [];
        for (let i = Math.max(1, start); i <= Math.min(8, end); i++) arr.push(i);
        return arr;
      }
    }
    const single = parseInt(trimmed.replace(/\D/g, ''), 10);
    if (!isNaN(single) && single >= 1 && single <= 8) {
      return [single];
    }
  }

  // 2. If periods string is missing/empty, derive periods from startTime & endTime
  if (req.startTime && req.endTime) {
    const toMinutes = (timeStr: string): number => {
      const clean = timeStr.trim();
      const match = clean.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (clean.toUpperCase().includes('PM') && h < 12) h += 12;
      if (clean.toUpperCase().includes('AM') && h === 12) h = 0;
      return h * 60 + m;
    };

    const reqStartM = toMinutes(req.startTime);
    const reqEndM = toMinutes(req.endTime);

    if (reqStartM > 0 && reqEndM > reqStartM) {
      const matchingPeriods: number[] = [];
      PERIOD_SLOTS.forEach(slot => {
        const slotStartM = toMinutes(slot.start);
        const slotEndM = toMinutes(slot.end);
        // Overlap condition: reqStart < slotEnd AND reqEnd > slotStart
        if (reqStartM < slotEndM && reqEndM > slotStartM) {
          matchingPeriods.push(slot.id);
        }
      });
      if (matchingPeriods.length > 0) return matchingPeriods;
    }
  }

  // Fallback: If no periods or time range can be parsed, assume all periods 1-8
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

export const REASON_LABELS: Record<string, string> = {
  internship: 'Internship',
  startup: 'Startup Work',
  project_development: 'Project Development',
  medical: 'Medical Leave',
  sports: 'Sports Event',
  family_emergency: 'Family Emergency',
  competition: 'Competition',
  other: 'Other',
};

export function extractRollSuffix(rawRoll: string): string {
  if (!rawRoll) return '';
  const str = rawRoll.trim().toUpperCase();

  // 1. Explicit LE prefix/infix (e.g. "24B91A07LE1", "24B91A07LE13")
  const leMatch = str.match(/LE0*([1-9]|[12][0-9]|30)$/i);
  if (leMatch) {
    return `LE${parseInt(leMatch[1], 10)}`;
  }

  // 2. Lateral Entry scheme: 95A code (e.g. "25B95A0701" -> "LE1", "25B95A0713" -> "LE13")
  if (str.includes('95A')) {
    const numMatch = str.match(/(\d{1,2})$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 30) {
        return `LE${num}`;
      }
    }
  }

  // 3. Regular 91A scheme (e.g. "24B91A0773" -> "73", "24B91A07B7" -> "B7", "24B91A0705" -> "5")
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

export const DEPARTMENTS = [
  'CSD',
  'CSIT',
];

// ─── Asia/Kolkata (IST) Date & Time Formatting Utilities ─────────────────────

export function formatKolkataDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatKolkataTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatKolkataDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return `${formatKolkataDate(d)}, ${formatKolkataTime(d)}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Converts a date (YYYY-MM-DD) and time (HH:mm) entered in IST (Asia/Kolkata)
 * into a standard UTC ISO-8601 string.
 */
export function toKolkataIsoString(dateStr: string, timeStr: string): string {
  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim();
  if (!trimmedDate || !trimmedTime) return '';
  const seconds = trimmedTime.split(':').length === 2 ? `${trimmedTime}:00` : trimmedTime;
  // Parse with +05:30 IST offset explicitly
  const isoWithOffset = `${trimmedDate}T${seconds}+05:30`;
  const parsed = new Date(isoWithOffset);
  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid date or time value');
  }
  return parsed.toISOString();
}

/**
 * Extracts { date: 'YYYY-MM-DD', time: 'HH:mm' } in Asia/Kolkata timezone
 * from an ISO string for pre-populating HTML <input type="date"> and <input type="time">.
 */
export function fromIsoToKolkataInputs(isoString: string | null | undefined): { date: string; time: string } {
  if (!isoString) return { date: '', time: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: '', time: '' };

    // Format parts in Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    let year = '', month = '', day = '', hour = '', minute = '';
    for (const part of parts) {
      if (part.type === 'year') year = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
    }

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  } catch {
    return { date: '', time: '' };
  }
}

export function getFacultyInitials(name: string | undefined | null): string {
  if (!name) return 'F';
  const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
