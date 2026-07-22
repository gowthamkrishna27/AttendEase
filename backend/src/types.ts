// Shared type definitions mirroring frontend types
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
