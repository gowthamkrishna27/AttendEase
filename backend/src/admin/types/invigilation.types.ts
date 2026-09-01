/**
 * invigilation.types.ts
 *
 * TypeScript types and interfaces for the Invigilation Management module.
 */
import type { ExamType } from '@prisma/client';

export interface FacultyAssignmentInput {
  facultyId: string;
  dutyType?: string | null;
}

export interface CreateDutyInput {
  examType: ExamType;
  examName: string;
  subjectName: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  blockName: string;
  roomNumber: string;
  assignedFaculty: FacultyAssignmentInput[];
}

export interface UpdateDutyInput {
  examType?: ExamType;
  examName?: string;
  subjectName?: string;
  startDateTime?: string | Date;
  endDateTime?: string | Date;
  blockName?: string;
  roomNumber?: string;
  assignedFaculty?: FacultyAssignmentInput[];
}

export interface InvigilationFilterQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  examType?: ExamType;
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
  dutyType?: string | null;
}

export interface InvigilationDutyResponse {
  id: string;
  examType: ExamType;
  examName: string;
  subjectName: string;
  startDateTime: string;
  endDateTime: string;
  blockName: string;
  roomNumber: string;
  createdAt: string;
  updatedAt: string;
  assignedFaculty: AssignedFacultyInfo[];
}

export interface InvigilationDutyListResponse {
  duties: InvigilationDutyResponse[];
  total: number;
}
