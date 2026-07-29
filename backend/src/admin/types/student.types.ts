/**
 * student.types.ts
 * All TypeScript interfaces/types related to the Student domain.
 * These are shared across validators, repositories, services, and controllers.
 */

// ── DB row shape (what comes out of the repository) ──────────────────────────

export interface StudentRecord {
  userId:     string;
  name:       string;
  email:      string;
  department: string;
  rollNumber: string;
  semester:   number;
  avatarUrl?: string;
  phone?:     string;
  isActive:   boolean;
}

// ── Request body shapes (validated by Zod before reaching the service) ────────

export interface CreateStudentBody {
  name:       string;
  email:      string;
  department: string;
  rollNumber: string;
  semester:   number;
  avatarUrl?: string;
  phone?:     string;
}

export interface UpdateStudentBody {
  name?:       string;
  email?:      string;
  department?: string;
  rollNumber?: string;
  semester?:   number;
  avatarUrl?:  string;
  phone?:      string;
}

// ── Query parameters for list endpoint ───────────────────────────────────────

export interface StudentListQuery {
  page:       number;
  pageSize:   number;
  search?:    string;   // matches name, email, rollNumber
  department?: string;
  semester?:  number;
}

// ── API response shapes ───────────────────────────────────────────────────────

/** Public student response — never includes the password hash */
export interface StudentResponse {
  id:         string;
  name:       string;
  email:      string;
  department: string;
  rollNumber: string;
  semester:   number;
  avatarUrl?: string;
  phone?:     string;
  isActive:   boolean;
}

export interface StudentListResponse {
  students:   StudentResponse[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}
