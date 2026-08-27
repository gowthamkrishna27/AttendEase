import crypto from 'crypto';

/**
 * URL-safe Base62 character alphabet for cryptographically secure high-entropy share tokens
 */
const BASE62_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

/**
 * Generate a cryptographically secure, high-entropy, URL-friendly share token.
 * 
 * Default Length: 16 characters (~96 bits of entropy)
 * Example output: "8F4K2P9X7MB3NQ5V"
 * 
 * - High entropy prevents enumeration attacks
 * - Never uses Math.random()
 * - Never uses sequential IDs or roll numbers
 * - Free of visually ambiguous characters (like 0/O, 1/l/I)
 */
export function generateShareToken(length: number = 16): string {
  const safeLength = Math.max(12, Math.min(length, 48));
  const bytes = crypto.randomBytes(safeLength * 2);
  let token = '';
  for (let i = 0; i < safeLength; i++) {
    const byteIndex = i * 2;
    const value = (bytes[byteIndex] << 8) | bytes[byteIndex + 1];
    token += BASE62_ALPHABET[value % BASE62_ALPHABET.length];
  }
  return token;
}

/**
 * Validate format of a share token before executing database queries.
 * Protects against injection, malformed requests, and excessive string lengths.
 */
export function isValidShareTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  // Allow alphanumeric characters, underscores, hyphens between 6 and 64 characters
  return /^[a-zA-Z0-9_-]{6,64}$/.test(trimmed);
}
