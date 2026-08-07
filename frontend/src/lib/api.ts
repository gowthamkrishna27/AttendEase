/**
 * Typed API client for AttendEase
 * Reads VITE_API_URL (defaults to http://localhost:3000)
 * Attaches JWT from localStorage to every authenticated request
 */

const getApiBase = (): string => {
  // If running in browser on localhost / 127.0.0.1, always target local backend
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3000';
  }

  // Otherwise (on Vercel production deployment), use VITE_API_URL or fallback to Render
  const envUrl = (import.meta.env['VITE_API_URL'] || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  return 'https://attendease-apuw.onrender.com';
};

const BASE = getApiBase();

const TOKEN_KEY = 'attendease_token';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, remember: boolean = true): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('attendease_remember_me', 'true');
  }
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('attendease_remember_me');
  localStorage.removeItem('attendease_saved_user');
  sessionStorage.removeItem(TOKEN_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RequestReason = 'internship' | 'medical' | 'sports' | 'family_emergency' | 'competition' | 'other';
export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';

export interface AuthUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  rollNumber?: string;
  semester?: number;
  year?: string;
  section?: string;
  avatarUrl?: string;
  phone?: string;
  counselorId?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  semester: number;
  email: string;
  section?: string;
  year?: string;
  avatarUrl?: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
  designation?: string;
  role?: string;
  avatarUrl?: string;
}

export interface RequestActionItem {
  id: string;
  action: string;
  remarks?: string;
  performedAt: string;
  performedBy: {
    id: string;
    name: string;
    role?: string;
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  requestId?: string;
}

export interface AttendanceRequest {
  id: string;
  publicId?: string;
  studentId: string;
  student?: Student;
  reason: RequestReason;
  reasonLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  documentName?: string;
  documentUrl?: string;
  status: RequestStatus;
  submittedAt: string;
  facultyId?: string;
  faculty?: Faculty;
  primaryFacultyId?: string;
  primaryFaculty?: Faculty;
  faculties?: Faculty[];
  reviewedAt?: string;
  finalDecisionBy?: 'Faculty' | 'HOD' | string;
  finalDecisionUserId?: string;
  finalDecisionName?: string;
  actions?: RequestActionItem[];
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (auth) {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const reqInit = { ...options, headers };
  let res: Response | null = null;
  try {
    res = await fetch(`${BASE}${path}`, reqInit);
  } catch {
    // If primary port fetch fails, iterate through local backend fallback ports (3000, 3001, 3002)
    const fallbackBases = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'].filter(b => b !== BASE);
    for (const fb of fallbackBases) {
      try {
        const fbRes = await fetch(`${fb}${path}`, reqInit);
        res = fbRes;
        break;
      } catch {
        // try next fallback port
      }
    }
  }

  if (!res) {
    throw new Error('Unable to connect to backend server. Please make sure the backend is running.');
  }

  if (!res.ok) {
    if (res.status === 401 && auth && !path.includes('/auth/login')) {
      clearStoredToken();
    }
    const body = await res.json().catch(() => ({ error: res.statusText || 'API error' }));
    throw new Error((body as { error?: string }).error ?? 'API error');
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(
  identifier: string,
  password: string,
  role: UserRole,
): Promise<{ token: string; user: AuthUser; hasPasskey?: boolean; passkeyCount?: number }> {
  return apiFetch<{ token: string; user: AuthUser; hasPasskey?: boolean; passkeyCount?: number }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ identifier, password, role }) },
    false,
  );
}

export async function registerPasskeyChallenge(identifier?: string): Promise<any> {
  return apiFetch<any>('/api/auth/passkey/register-challenge', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export async function registerPasskey(
  credentialId: string,
  publicKey?: string,
  deviceName?: string,
  identifier?: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>('/api/auth/passkey/register', {
    method: 'POST',
    body: JSON.stringify({ credentialId, publicKey, deviceName, identifier }),
  });
}

export async function loginPasskeyChallenge(identifier: string): Promise<{
  challenge: string;
  hasPasskey: boolean;
  user: { userId: string; email: string; name: string };
  allowCredentials: { id: string; type: string }[];
}> {
  return apiFetch('/api/auth/passkey/login-challenge', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  }, false);
}

export async function verifyPasskeyLogin(
  identifier: string,
  credentialId?: string,
): Promise<{ token: string; user: AuthUser }> {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/passkey/verify', {
    method: 'POST',
    body: JSON.stringify({ identifier, credentialId }),
  }, false);
}

export async function listPasskeys(): Promise<{ devices: { id: string; credentialId: string; deviceName?: string; createdAt: string; lastUsedAt: string }[] }> {
  return apiFetch('/api/auth/passkey/list');
}

export async function removePasskey(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/auth/passkey/remove/${id}`, { method: 'DELETE' });
}

export async function removeAllPasskeys(): Promise<{ success: boolean }> {
  return apiFetch('/api/auth/passkey/remove-all', { method: 'DELETE' });
}

export interface PublicFacultyMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation?: string;
  avatarUrl?: string;
}

export async function getPublicFacultyList(): Promise<PublicFacultyMember[]> {
  try {
    const res = await apiFetch<{ faculty: PublicFacultyMember[] }>('/api/auth/public-faculty', {}, false);
    return res.faculty;
  } catch {
    return [];
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
  clearStoredToken();
}

// ─── Requests ─────────────────────────────────────────────────────────────────

// NOTE: ?department= param intentionally removed — scope is always derived from the
// JWT on the backend. Param kept in signature to avoid call-site breakage.
export async function getRequests(_params?: { department?: string }): Promise<AttendanceRequest[]> {
  const res = await apiFetch<{ requests: AttendanceRequest[] }>('/api/requests');
  return res.requests;
}

export async function getPublicApprovedRequests(params?: {
  date?: string;
  section?: string;
  year?: string;
  department?: string;
}): Promise<AttendanceRequest[]> {
  const queryParams = new URLSearchParams();
  if (params?.date) queryParams.set('date', params.date);
  if (params?.section) queryParams.set('section', params.section);
  if (params?.year) queryParams.set('year', params.year);
  if (params?.department) queryParams.set('department', params.department);

  const url = `/api/requests/public-approved${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await apiFetch<{ requests: AttendanceRequest[] }>(url, {}, false);
  return res.requests;
}

export async function getRequest(id: string): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(`/api/requests/${id}`);
  return res.request;
}

export interface CreateRequestPayload {
  reason: RequestReason;
  date: string;
  endDate?: string;
  periods?: string;
  startTime: string;
  endTime: string;
  description: string;
  documentName?: string;
  documentUrl?: string;
  facultyId?: string;
  facultyIds?: string[];
}

export async function uploadProofDocument(file: File): Promise<{ url: string; name: string }> {
  // 1. Try uploading via Backend Cloudinary upload route
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dataUrl = await base64Promise;

    const res = await apiFetch<{ url: string; documentName: string }>('/api/requests/upload-proof', {
      method: 'POST',
      body: JSON.stringify({ file: dataUrl, filename: file.name }),
    });

    if (res && res.url) {
      console.log('Proof uploaded via backend Cloudinary endpoint:', res.url);
      return { url: res.url, name: res.documentName || file.name };
    }
  } catch (err) {
    console.warn('Backend upload-proof endpoint error, trying direct Cloudinary upload:', err);
  }

  // 2. Direct Cloudinary upload fallback
  try {
    const cloudName = import.meta.env['VITE_CLOUDINARY_CLOUD_NAME'] || 'yp5l3jrg';
    const uploadPreset = import.meta.env['VITE_CLOUDINARY_UPLOAD_PRESET'] || 'attendease_proofs';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const directUrl = data.secure_url || data.url;
      if (directUrl) {
        console.log('Proof uploaded directly to Cloudinary:', directUrl);
        return { url: directUrl, name: file.name };
      }
    }
  } catch (err) {
    console.warn('Direct Cloudinary upload error:', err);
  }

  return { url: '', name: file.name };
}

export async function createRequest(data: CreateRequestPayload): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    '/api/requests',
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.request;
}

export async function updateRequest(id: string, data: Partial<CreateRequestPayload>): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    `/api/requests/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return res.request;
}

export async function deleteRequest(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/requests/${id}`, {
    method: 'DELETE',
  });
}

export async function reviewRequest(
  id: string,
  action: 'approve' | 'reject',
  rejectionReason?: string,
): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    `/api/requests/${id}`,
    {
      method: 'PATCH',
      headers: { 'x-role-override': 'hod' },
      body: JSON.stringify({ action, rejectionReason, roleOverride: 'hod' }),
    },
  );
  return res.request;
}

export async function cancelRequest(id: string): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    `/api/requests/${id}/cancel`,
    { method: 'POST' },
  );
  return res.request;
}

export async function getRequestActions(id: string): Promise<RequestActionItem[]> {
  const res = await apiFetch<{ actions: RequestActionItem[] }>(`/api/requests/${id}/actions`);
  return res.actions;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<NotificationItem[]> {
  const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
  return res.notifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getFaculty(): Promise<Faculty[]> {
  const res = await apiFetch<{ faculty: Faculty[] }>('/api/users/faculty');
  return res.faculty;
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/api/users/me');
  return res.user;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  avatarUrl?: string;
  phone?: string;
  semester?: number;
  currentPassword?: string;
  password?: string;
}

export async function updateMe(data: UpdateProfilePayload): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.user;
}

// ─── Admin Users API ──────────────────────────────────────────────────────────

export interface CreateUserPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  password?: string;
  rollNumber?: string;
  semester?: number;
  year?: string;
  section?: string;
  designation?: string;
  phone?: string;
  counselorId?: string;
}

export async function getUsers(): Promise<AuthUser[]> {
  const res = await apiFetch<{ users: AuthUser[] }>('/api/admin/users');
  return res.users ?? [];
}

export async function createUser(data: CreateUserPayload): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.user;
}

export async function updateUser(id: string, data: Partial<CreateUserPayload>): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password: newPassword }),
  });
}

// ─── Attendance API ──────────────────────────────────────────────────────────

export interface AttendanceRecordItem {
  id: string;
  submissionId: string;
  rollNumber: string;
  status: 'present' | 'absent';
}

export interface AttendanceSubmissionItem {
  id: string;
  date: string;
  section: string;
  year: string;
  periods: string;
  periodLabel: string;
  markedById: string;
  createdAt: string;
  updatedAt: string;
  markedBy: {
    userId: string;
    name: string;
    email: string;
    department: string;
  };
  records: AttendanceRecordItem[];
}

export interface SubmitAttendancePayload {
  date: string;
  section: string;
  year?: string;
  periods: string;
  periodLabel?: string;
  records: { rollNumber: string; status: 'present' | 'absent' }[];
}

export async function getAttendanceSubmissions(date?: string, section?: string, year?: string): Promise<AttendanceSubmissionItem[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (section) params.append('section', section);
  if (year) params.append('year', year);

  const queryString = params.toString();
  const url = `/api/attendance${queryString ? `?${queryString}` : ''}`;
  const res = await apiFetch<{ submissions: AttendanceSubmissionItem[] }>(url, {}, false);
  return res.submissions ?? [];
}

export async function submitSectionAttendance(payload: SubmitAttendancePayload): Promise<AttendanceSubmissionItem> {
  const res = await apiFetch<{ submission: AttendanceSubmissionItem }>('/api/attendance/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.submission;
}

export interface CounseleeStudent extends AuthUser {
  stats?: {
    conductedCount: number;
    presentCount: number;
    approvedPermissionsCount: number;
    absentCount: number;
    percentage: number;
  };
}

export async function getCounselees(): Promise<CounseleeStudent[]> {
  const res = await apiFetch<{ counselees: CounseleeStudent[] }>('/api/users/counselees');
  return res.counselees ?? [];
}

export interface FacultyCounselorOverview extends AuthUser {
  counselees: AuthUser[];
}

export interface AdminCounselingData {
  facultyCounselors: FacultyCounselorOverview[];
  unassignedStudents: AuthUser[];
}

export async function getAdminCounselingData(): Promise<AdminCounselingData> {
  return apiFetch<AdminCounselingData>('/api/users/counseling/all');
}

export async function assignCounselingStudents(facultyId: string, studentIds: string[]): Promise<{ success: boolean; message: string; count: number }> {
  return apiFetch('/api/users/counseling/assign', {
    method: 'POST',
    body: JSON.stringify({ facultyId, studentIds }),
  });
}

export async function unassignCounselingStudent(studentId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/users/counseling/unassign', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

export async function getShareRedirect(publicId: string): Promise<{ success: boolean; redirectTo?: string; status?: number; error?: string }> {
  return apiFetch<{ success: boolean; redirectTo?: string; status?: number; error?: string }>(`/api/share/${encodeURIComponent(publicId)}`);
}


