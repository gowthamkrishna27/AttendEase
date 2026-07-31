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

export const REASON_LABELS: Record<string, string> = {
  internship: 'Internship',
  medical: 'Medical Leave',
  sports: 'Sports Event',
  family_emergency: 'Family Emergency',
  competition: 'Competition',
  other: 'Other',
};

export const DEPARTMENTS = [
  'CSD',
  'CSIT',
];
