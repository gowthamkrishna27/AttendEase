/**
 * Typed API client for AttendEase
 * Reads VITE_API_URL (defaults to http://localhost:3000)
 * Attaches JWT from localStorage to every authenticated request
 */

const BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

const TOKEN_KEY = 'attendease_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RequestReason = 'internship' | 'medical' | 'sports' | 'family_emergency' | 'competition' | 'other';
export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  rollNumber?: string;
  semester?: number;
  avatarUrl?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  semester: number;
  email: string;
  avatarUrl?: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
  designation?: string;
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
  studentId: string;
  student?: Student;
  reason: RequestReason;
  reasonLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  documentName?: string;
  status: RequestStatus;
  submittedAt: string;
  facultyId?: string;
  faculty?: Faculty;
  faculties?: Faculty[];
  reviewedAt?: string;
  finalDecisionBy?: 'Faculty' | 'HOD';
  finalDecisionUserId?: string;
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
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, reqInit);
  } catch {
    // If primary port fetch fails (e.g. backend restarted on port 3001), try fallback port 3001
    const fallbackBase = BASE.includes('3000') ? BASE.replace('3000', '3001') : 'http://localhost:3000';
    try {
      res = await fetch(`${fallbackBase}${path}`, reqInit);
    } catch {
      throw new Error('Unable to connect to backend server. Please make sure the backend is running.');
    }
  }

  if (!res.ok) {
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
): Promise<{ token: string; user: AuthUser }> {
  return apiFetch<{ token: string; user: AuthUser }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ identifier, password, role }) },
    false,
  );
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

export async function getRequest(id: string): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(`/api/requests/${id}`);
  return res.request;
}

export interface CreateRequestPayload {
  reason: RequestReason;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  documentName?: string;
  facultyId?: string;
  facultyIds?: string[];
}

export async function createRequest(data: CreateRequestPayload): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    '/api/requests',
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.request;
}

export async function reviewRequest(
  id: string,
  action: 'approve' | 'reject',
  rejectionReason?: string,
): Promise<AttendanceRequest> {
  const res = await apiFetch<{ request: AttendanceRequest }>(
    `/api/requests/${id}`,
    { method: 'PATCH', body: JSON.stringify({ action, rejectionReason }) },
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
  dob?: string;
  gender?: string;
  address?: string;
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
  name: string;
  email: string;
  role: UserRole;
  department: string;
  password?: string;
  rollNumber?: string;
  semester?: number;
  designation?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
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
