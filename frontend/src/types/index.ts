// TypeScript type definitions for AttendEase

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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
  section?: string;
  year?: string;
  avatarUrl?: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
  avatarUrl?: string;
  designation?: string;
  role?: string;
}

export interface AttendanceRequest {
  id: string;
  studentId: string;
  student?: Student;
  reason: RequestReason;
  reasonLabel: string;
  date: string; // ISO date string YYYY-MM-DD
  endDate?: string; // ISO date string YYYY-MM-DD for multi-day leave
  periods?: string; // comma-separated period numbers e.g. "1,2,3,4"
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  description: string;
  documentName?: string;
  documentUrl?: string;
  status: RequestStatus;
  submittedAt: string; // ISO datetime string
  facultyId?: string;
  faculty?: Faculty;
  primaryFacultyId?: string;
  primaryFaculty?: Faculty;
  facultyIds?: string[];
  faculties?: Faculty[];
  reviewedAt?: string;
  rejectionReason?: string;
  finalDecisionBy?: string;
  finalDecisionName?: string;
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

export interface HODDirectExemptionPayload {
  studentIds: string[];
  reason: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  periods?: string;
  description?: string;
}
