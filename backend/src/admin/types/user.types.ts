/**
 * user.types.ts
 * TypeScript interfaces for admin User Management and Password Management.
 */

export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';

// ── Request body shapes ───────────────────────────────────────────────────────

export interface CreateUserBody {
  userId:      string;
  name:        string;
  email:       string;
  role:        UserRole;
  department:  string;
  password:    string;
  rollNumber?: string;   // required when role === 'student'
  year?:       string;
  section?:    string;
  semester?:   number;   // required when role === 'student'
  avatarUrl?:  string;
}

export interface UpdateUserBody {
  name?:       string;
  email?:      string;
  role?:       UserRole;
  department?: string;
  rollNumber?: string;
  year?:       string;
  section?:    string;
  semester?:   number;
  avatarUrl?:  string;
  password?:   string;
}

export interface SelfPasswordChangeBody {
  currentPassword: string;
  newPassword:     string;
}

export interface AdminPasswordResetBody {
  newPassword: string;
}

// ── API response shape ────────────────────────────────────────────────────────

/** Public user response — password hash is always stripped */
export interface UserResponse {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  department:  string;
  rollNumber?: string;
  year?:       string;
  section?:    string;
  semester?:   number;
  avatarUrl?:  string;
  isActive:    boolean;
}


export interface UserListResponse {
  users: UserResponse[];
}
