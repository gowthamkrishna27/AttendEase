import type { AttendanceRequest, Student, Faculty } from './types.js';

// ─── Users ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod';
  department: string;
  password: string;
  rollNumber?: string;
  semester?: number;
  avatarUrl?: string;
}

export const users: UserRecord[] = [
  {
    id: 'stu-001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@college.edu',
    role: 'student',
    department: 'Computer Science',
    rollNumber: '24B91A0720',
    semester: 6,
    password: 'student123',
    avatarUrl: 'https://srkrexams.in/SRKR/photo/24B91A0720.jpg',
  },
  {
    id: 'fac-001',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@college.edu',
    role: 'faculty',
    department: 'Computer Science',
    password: 'faculty123',
  },
  {
    id: 'hod-001',
    name: 'Prof. Suresh Menon',
    email: 'hod.cs@college.edu',
    role: 'hod',
    department: 'Computer Science',
    password: 'hod123',
  },
];

// ─── Students (for requests) ──────────────────────────────────────────────────

export const students: Student[] = [
  {
    id: 'stu-001',
    name: 'Arjun Sharma',
    rollNumber: '24B91A0720',
    department: 'Computer Science',
    semester: 6,
    email: 'arjun.sharma@college.edu',
    avatarUrl: 'https://srkrexams.in/SRKR/photo/24B91A0720.jpg',
  },
  {
    id: 'stu-002',
    name: 'Meera Iyer',
    rollNumber: '21CS052',
    department: 'Computer Science',
    semester: 6,
    email: 'meera.iyer@college.edu',
  },
  {
    id: 'stu-003',
    name: 'Karan Mehta',
    rollNumber: '21EC021',
    department: 'Electronics',
    semester: 5,
    email: 'karan.mehta@college.edu',
  },
  {
    id: 'stu-004',
    name: 'Divya Patel',
    rollNumber: '21ME033',
    department: 'Mechanical',
    semester: 4,
    email: 'divya.patel@college.edu',
  },
  {
    id: 'stu-005',
    name: 'Rohit Verma',
    rollNumber: '21CS019',
    department: 'Computer Science',
    semester: 6,
    email: 'rohit.verma@college.edu',
  },
];

// ─── Faculty (for requests) ───────────────────────────────────────────────────

export const faculty: Faculty[] = [
  { id: 'fac-001', name: 'Dr. Priya Nair',     department: 'Computer Science', email: 'priya.nair@college.edu'   },
  { id: 'fac-002', name: 'Prof. Ramesh Kumar', department: 'Electronics',      email: 'ramesh.kumar@college.edu' },
  { id: 'fac-003', name: 'Dr. Anita Desai',    department: 'Mechanical',       email: 'anita.desai@college.edu'  },
];

// ─── Requests (mutable in-memory store) ──────────────────────────────────────

let _requests: AttendanceRequest[] = [];

let _nextId = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findUser(emailOrRoll: string): UserRecord | undefined {
  const q = emailOrRoll.toLowerCase();
  return users.find(u => u.email.toLowerCase() === q || (u.rollNumber ?? '').toLowerCase() === q);
}

export function getRequests(): AttendanceRequest[] {
  return [..._requests];
}

export function getRequestById(id: string): AttendanceRequest | undefined {
  return _requests.find(r => r.id === id);
}

export function createRequest(data: Omit<AttendanceRequest, 'id' | 'submittedAt' | 'student' | 'faculty'>): AttendanceRequest {
  const student = students.find(s => s.id === data.studentId);
  const fac     = faculty.find(f => f.id === 'fac-001'); // default faculty for now
  const req: AttendanceRequest = {
    ...data,
    id: `req-${String(_nextId++).padStart(3, '0')}`,
    submittedAt: new Date().toISOString(),
    student,
    faculty: fac,
    facultyId: fac?.id,
  };
  _requests.unshift(req);
  return req;
}

export function updateRequest(
  id: string,
  patch: { status: 'approved' | 'rejected'; rejectionReason?: string },
): AttendanceRequest | undefined {
  const idx = _requests.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  _requests[idx] = {
    ..._requests[idx],
    ...patch,
    reviewedAt: new Date().toISOString(),
  };
  return _requests[idx];
}
