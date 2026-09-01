/**
 * invigilation.types.ts
 *
 * TypeScript types and interfaces for the Invigilation Management module.
 */
import type { ExamType, SessionType } from '@prisma/client';

export type { ExamType, SessionType };

export interface FacultyAssignmentInput {
  facultyId: string;
}

export interface CreateDutyInput {
  examType: ExamType;
  date: string;          // YYYY-MM-DD
  session: SessionType;  // MORNING | AFTERNOON
  startTime?: string | null;  // Optional HH:mm
  endTime?: string | null;    // Optional HH:mm
  assignedFaculty: FacultyAssignmentInput[];
}

export interface UpdateDutyInput {
  examType?: ExamType;
  date?: string;
  session?: SessionType;
  startTime?: string | null;
  endTime?: string | null;
  assignedFaculty?: FacultyAssignmentInput[];
}

export interface InvigilationFilterQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  examType?: ExamType;
  session?: SessionType;
  facultyId?: string;
  department?: string;
}

export interface AssignedFacultyInfo {
  assignmentId: string;
  facultyId: string; // User.id
  userId: string;    // User.userId (e.g. "fac-001")
  name: string;
  email: string;
  department: string;
  designation?: string | null;
}

export interface InvigilationDutyResponse {
  id: string;
  examType: ExamType;
  date: string;
  session: SessionType;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  assignedFaculty: AssignedFacultyInfo[];
}

export interface InvigilationDutyListResponse {
  duties: InvigilationDutyResponse[];
  total: number;
}
