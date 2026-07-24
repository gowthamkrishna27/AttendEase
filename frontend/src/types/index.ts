// TypeScript type definitions for AttendEase

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type RequestReason =
  | 'internship'
  | 'medical'
  | 'sports'
  | 'family_emergency'
  | 'competition'
  | 'other';

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
  avatarUrl?: string;
  designation?: string;
}

export interface AttendanceRequest {
  id: string;
  studentId: string;
  student?: Student;
  reason: RequestReason;
  reasonLabel: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  description: string;
  documentName?: string;
  documentUrl?: string;
  status: RequestStatus;
  submittedAt: string; // ISO datetime string
  facultyId?: string;
  faculty?: Faculty;
  facultyIds?: string[];
  faculties?: Faculty[];
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface NewRequestFormData {
  reason: RequestReason;
  date: Date;
  startTime: string;
  endTime: string;
  description: string;
  document?: File;
}

export interface FacultyFilters {
  search: string;
  department: string;
  dateFrom: string;
  dateTo: string;
}
