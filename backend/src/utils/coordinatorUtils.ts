import crypto from 'crypto';

/**
 * Normalizes and computes SHA-256 hash of a coordinator authorization code.
 * Strips whitespace, hyphens, and converts to uppercase for flexible entry.
 */
export function hashCoordinatorCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generates a 4-letter + 4-digit combo derived from the faculty member's name.
 * Example: "Dr. J. Somaraju" -> "SOMA4829"
 * Example: "Gowtham Krishna" -> "GOWT1234"
 */
export function generateFacultyCoordinatorCode(facultyName?: string): string {
  let letters = 'FACU';

  if (facultyName && typeof facultyName === 'string') {
    // Strip titles like Dr, Mr, Mrs, Prof, Ms and non-alphabetic chars
    const clean = facultyName
      .replace(/^(dr|mr|mrs|prof|ms)\.?\s+/i, '')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase();

    if (clean.length >= 4) {
      letters = clean.slice(0, 4);
    } else if (clean.length > 0) {
      letters = (clean + 'FACU').slice(0, 4);
    }
  }

  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${letters}${digits}`;
}

export function generateUniqueCoordinatorCode(facultyName?: string): string {
  return generateFacultyCoordinatorCode(facultyName);
}

/**
 * Generates a masked display representation for stored access records.
 * Example: "SOMA4829" -> "SOMA••••"
 */
export function maskCoordinatorCode(code: string): string {
  const clean = code.trim().toUpperCase();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}••••`;
  }
  if (clean.length > 4) {
    return `${clean.slice(0, 4)}••••`;
  }
  return `CODE: ${clean}`;
}
