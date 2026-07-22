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

export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestReason = 'internship' | 'medical' | 'sports' | 'family_emergency' | 'competition' | 'other';
export type UserRole = 'student' | 'faculty' | 'hod';

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
  reviewedAt?: string;
  rejectionReason?: string;
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

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
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
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearStoredToken();
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function getRequests(params?: { department?: string }): Promise<AttendanceRequest[]> {
  const qs = params?.department ? `?department=${encodeURIComponent(params.department)}` : '';
  const res = await apiFetch<{ requests: AttendanceRequest[] }>(`/api/requests${qs}`);
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

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getFaculty(): Promise<Faculty[]> {
  const res = await apiFetch<{ faculty: Faculty[] }>('/api/users/faculty');
  return res.faculty;
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/api/users/me');
  return res.user;
}

export type UpdateProfilePayload = Partial<{
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  avatarUrl: string;
  password: string;
  currentPassword?: string;
}>;

export async function updateMe(data: UpdateProfilePayload): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>(
    '/api/users/me',
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return res.user;
}
