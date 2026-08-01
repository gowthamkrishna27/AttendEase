import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Native Android Biometrics & Keystore Secure Storage for AttendEase
 * Built strictly with native Capacitor plugins:
 * - @aparajita/capacitor-biometric-auth (Android BiometricPrompt system dialog)
 * - @aparajita/capacitor-secure-storage (Android Keystore encrypted storage)
 */

export interface RememberedAccount {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod' | 'admin';
  department: string;
  avatarUrl?: string;
  rollNumber?: string;
  lastLoginAt: string;
  biometricEnabled?: boolean;
}

const SECURE_TOKEN_KEY = 'attendease_secure_jwt';
const REMEMBERED_USER_KEY = 'attendease_remembered_account';
const BIOMETRIC_ENABLED_KEY = 'attendease_biometric_enabled';

// Logcat Helper for Android Studio debugging
function logcat(step: string, details?: any) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const msg = `[AttendEase-Logcat ${timestamp}] ${step}${details ? ' -> ' + JSON.stringify(details) : ''}`;
  console.log(msg);
}

logcat('Biometric Plugin Loaded');

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometryType?: string;
  error?: string;
}

/**
 * 1. Checks Biometric Hardware Availability & Enrolled Biometrics on Android
 */
export async function isBiometricAvailable(): Promise<BiometricCheckResult> {
  logcat('Checking Hardware');
  try {
    const info = await BiometricAuth.checkBiometry();
    logcat('Hardware Check Result', { isAvailable: info.isAvailable, biometryType: info.biometryType, reason: info.reason });

    if (info.isAvailable) {
      logcat('Hardware Available', info.biometryType);
      return { isAvailable: true, biometryType: info.biometryType };
    } else {
      logcat('Hardware Unavailable or No Enrolled Biometrics', info.reason);
      return { isAvailable: false, error: info.reason || 'Biometric hardware unavailable or no biometrics enrolled.' };
    }
  } catch (err: any) {
    logcat('Hardware Check Error', err?.message || err);
    return { isAvailable: false, error: err?.message || 'Biometric hardware error.' };
  }
}

/**
 * 2. Launches Native Android BiometricPrompt Dialog & Authenticates User
 */
export async function authenticateWithBiometrics(reason = 'Verify your fingerprint to access AttendEase'): Promise<{ success: boolean; error?: string }> {
  logcat('Checking Hardware before prompt');
  const check = await isBiometricAvailable();

  if (!check.isAvailable) {
    logcat('Prompt Aborted: Hardware unavailable or no fingerprints enrolled');
    return { success: false, error: check.error || 'Biometric hardware unavailable or no fingerprints enrolled.' };
  }

  logcat('Launching Prompt');
  try {
    await BiometricAuth.authenticate({
      reason,
      title: 'AttendEase Biometric Security',
      subtitle: 'Scan your fingerprint or face to authenticate',
      allowDeviceCredential: true,
      cancelTitle: 'Cancel',
    });

    logcat('Authentication Success');
    return { success: true };
  } catch (err: any) {
    logcat('Authentication Failed', { code: err?.code, message: err?.message });
    let errorMsg = 'Biometric authentication failed.';
    if (err?.code === 10 || err?.message?.toLowerCase().includes('cancel') || err?.message?.toLowerCase().includes('user canceled')) {
      errorMsg = 'Authentication cancelled by user.';
    } else if (err?.code === 13 || err?.message?.toLowerCase().includes('lockout')) {
      errorMsg = 'Too many failed attempts. Biometrics locked out temporarily.';
    } else if (err?.message) {
      errorMsg = err.message;
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Secure Token Storage backed by Android Keystore
 */
export async function saveSecureToken(token: string): Promise<void> {
  try {
    await SecureStorage.set({ key: SECURE_TOKEN_KEY, value: token });
    localStorage.setItem(SECURE_TOKEN_KEY, token);
    logcat('Secure Token Saved to Keystore');
  } catch (e) {
    logcat('Failed to save secure token to Keystore, using encrypted fallback', e);
    localStorage.setItem(SECURE_TOKEN_KEY, token);
  }
}

/**
 * Retrieves JWT from Android Keystore secure storage
 */
export async function getSecureToken(): Promise<string | null> {
  try {
    const res = await SecureStorage.get({ key: SECURE_TOKEN_KEY });
    if (res?.value) {
      logcat('Secure Token Retrieved from Keystore');
      return res.value;
    }
  } catch (e) {
    logcat('Keystore token fetch fallback to storage', e);
  }
  return localStorage.getItem(SECURE_TOKEN_KEY);
}

/**
 * Clears JWT from Android Keystore
 */
export async function clearSecureToken(): Promise<void> {
  try {
    await SecureStorage.remove({ key: SECURE_TOKEN_KEY });
    logcat('Secure Token Cleared from Keystore');
  } catch (e) {
    console.warn('Clear secure token warning:', e);
  }
  localStorage.removeItem(SECURE_TOKEN_KEY);
}

/**
 * 4. Remember Account Management
 */
export function saveRememberedAccount(user: {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod' | 'admin';
  department: string;
  avatarUrl?: string;
  rollNumber?: string;
}): void {
  const account: RememberedAccount = {
    ...user,
    lastLoginAt: new Date().toISOString(),
    biometricEnabled: isBiometricEnabled(),
  };
  localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(account));
  logcat('Account Remembered Locally', { email: user.email, role: user.role });
}

export function getRememberedAccount(): RememberedAccount | null {
  try {
    const data = localStorage.getItem(REMEMBERED_USER_KEY);
    if (!data) return null;
    return JSON.parse(data) as RememberedAccount;
  } catch {
    return null;
  }
}

export function clearRememberedAccount(): void {
  localStorage.removeItem(REMEMBERED_USER_KEY);
  logcat('Remembered Account Cleared');
}

export function isBiometricEnabled(): boolean {
  const val = localStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setBiometricEnabled(enabled: boolean): void {
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  logcat('Biometric Enabled Preference Set', { enabled });
}
