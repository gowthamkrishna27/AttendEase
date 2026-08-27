/**
 * Canonical Request Authorization Service for AttendEase
 * 
 * Reused across:
 * - /r/:shareToken (Share Token Resolver)
 * - /api/requests/:id (Normal Request Fetching)
 * - /api/requests/:id/review (Faculty/HOD Review)
 * - /api/requests/:id (Student Updates)
 */

export type ViewerType = 'STUDENT_OWNER' | 'FACULTY' | 'HOD' | 'ADMIN';
export type Destination = 'STUDENT_VIEW' | 'FACULTY_REVIEW' | 'HOD_REVIEW' | 'ADMIN_REVIEW';

export interface AuthUserContext {
  id: string;
  userId?: string;
  email?: string;
  role: 'student' | 'faculty' | 'hod' | 'admin' | string;
  name?: string;
  department?: string;
  rollNumber?: string;
}

export interface RequestAuthResult {
  authorized: boolean;
  viewerType?: ViewerType;
  destination?: Destination;
  requestId?: string;
  redirectPath?: string;
  viewMode?: 'read-only';
  error?: string;
}

/**
 * Normalizes student identifiers to a canonical alphanumeric form:
 * - "stu-24B91A0501" -> "24b91a0501"
 * - "24B91A0501@srkrec.ac.in" -> "24b91a0501"
 * - " 24b91a0501 " -> "24b91a0501"
 */
export function normalizeStudentId(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim().toLowerCase();
  if (str.includes('@')) {
    str = str.split('@')[0];
  }
  if (str.startsWith('stu-')) {
    str = str.slice(4);
  } else if (str.startsWith('student-')) {
    str = str.slice(8);
  }
  return str.trim();
}

/**
 * Normalizes user/faculty IDs for exact identity comparison
 */
export function normalizeId(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

/**
 * 1. STUDENT OWNERSHIP
 * Exact canonical identity comparison between authenticated user and request owner.
 * Never uses student name matching.
 */
export function isStudentOwnerOfRequest(request: any, user: AuthUserContext): boolean {
  if (user.role !== 'student') return false;

  // Build canonical identities for the user
  const userCanonicalIds = new Set<string>();
  if (user.id) userCanonicalIds.add(normalizeStudentId(user.id));
  if (user.userId) userCanonicalIds.add(normalizeStudentId(user.userId));
  if (user.rollNumber) userCanonicalIds.add(normalizeStudentId(user.rollNumber));
  if (user.email) userCanonicalIds.add(normalizeStudentId(user.email));

  // Remove empty strings
  userCanonicalIds.delete('');

  if (userCanonicalIds.size === 0) return false;

  // Build canonical identities for the request owner
  const ownerCanonicalIds = new Set<string>();
  if (request.studentId) ownerCanonicalIds.add(normalizeStudentId(request.studentId));
  if (request.student?.userId) ownerCanonicalIds.add(normalizeStudentId(request.student.userId));
  if (request.student?.id) ownerCanonicalIds.add(normalizeStudentId(request.student.id));
  if (request.student?.rollNumber) ownerCanonicalIds.add(normalizeStudentId(request.student.rollNumber));
  if (request.student?.email) ownerCanonicalIds.add(normalizeStudentId(request.student.email));

  ownerCanonicalIds.delete('');

  // Exact set intersection
  for (const uId of userCanonicalIds) {
    if (ownerCanonicalIds.has(uId)) {
      return true;
    }
  }

  return false;
}

/**
 * 2. FACULTY AUTHORIZATION
 * Reuses the existing AttendEase faculty assignment rules:
 * Must be either primaryFacultyId or assigned in faculties join table.
 */
export function isFacultyAuthorizedForRequest(request: any, user: AuthUserContext): boolean {
  if (user.role !== 'faculty') return false;

  const userId = normalizeId(user.id || user.userId);
  const userEmail = normalizeId(user.email);

  if (!userId && !userEmail) return false;

  // Primary faculty matches
  const primaryFacId = normalizeId(request.primaryFacultyId);
  const primaryFacUserId = normalizeId(request.primaryFaculty?.userId);
  const primaryFacDbId = normalizeId(request.primaryFaculty?.id);
  const primaryEmail = normalizeId(request.primaryFaculty?.email);

  if (
    (primaryFacId && primaryFacId === userId) ||
    (primaryFacUserId && primaryFacUserId === userId) ||
    (primaryFacDbId && primaryFacDbId === userId) ||
    (primaryEmail && primaryEmail === userEmail)
  ) {
    return true;
  }

  // Assigned faculties join table matches
  if (request.faculties && Array.isArray(request.faculties)) {
    for (const rf of request.faculties) {
      const facId = normalizeId(rf.facultyId);
      const facUserId = normalizeId(rf.faculty?.userId);
      const facDbId = normalizeId(rf.faculty?.id);
      const facEmail = normalizeId(rf.faculty?.email);

      if (
        (facId && facId === userId) ||
        (facUserId && facUserId === userId) ||
        (facDbId && facDbId === userId) ||
        (facEmail && facEmail === userEmail)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 3. HOD AUTHORIZATION
 * Reuses existing AttendEase HOD rules (department scoping).
 */
export function isHodAuthorizedForRequest(request: any, user: AuthUserContext): boolean {
  if (user.role !== 'hod') return false;

  const hodDept = normalizeId(user.department);
  const reqDept = normalizeId(request.student?.department || request.department);

  // If HOD is scoped to a specific department, it must match
  if (hodDept && reqDept && hodDept !== 'all' && hodDept !== reqDept) {
    return false;
  }

  return true;
}

/**
 * 4. ADMIN AUTHORIZATION
 * Kept strictly separate from HOD.
 */
export function isAdminAuthorizedForRequest(_request: any, user: AuthUserContext): boolean {
  return user.role === 'admin';
}

/**
 * 7. CENTRALIZED AUTHORIZATION RESOLVER
 * Unified authorization evaluator used across routes.
 */
export function authorizeRequestViewer(request: any, user: AuthUserContext): RequestAuthResult {
  const resolvedPublicId = request.requestId || request.publicId || request.id;

  // 1. Student Owner
  if (user.role === 'student') {
    if (isStudentOwnerOfRequest(request, user)) {
      return {
        authorized: true,
        viewerType: 'STUDENT_OWNER',
        destination: 'STUDENT_VIEW',
        requestId: resolvedPublicId,
        redirectPath: `/student/request/${resolvedPublicId}`,
        viewMode: 'read-only',
      };
    }
    return {
      authorized: false,
      error: "Request not found or you don't have permission to view it.",
    };
  }

  // 2. Faculty
  if (user.role === 'faculty') {
    const isAssigned = isFacultyAuthorizedForRequest(request, user);
    return {
      authorized: true,
      viewerType: 'FACULTY',
      destination: 'FACULTY_REVIEW',
      requestId: resolvedPublicId,
      redirectPath: `/faculty/review/${resolvedPublicId}`,
      viewMode: isAssigned ? undefined : 'read-only',
    };
  }

  // 3. Authorized HOD
  if (user.role === 'hod') {
    if (isHodAuthorizedForRequest(request, user)) {
      return {
        authorized: true,
        viewerType: 'HOD',
        destination: 'HOD_REVIEW',
        requestId: resolvedPublicId,
        redirectPath: `/hod/review/${resolvedPublicId}`,
      };
    }
    return {
      authorized: false,
      error: "Request not found or you don't have permission to view it.",
    };
  }

  // 4. Admin
  if (user.role === 'admin') {
    if (isAdminAuthorizedForRequest(request, user)) {
      return {
        authorized: true,
        viewerType: 'ADMIN',
        destination: 'ADMIN_REVIEW',
        requestId: resolvedPublicId,
        redirectPath: `/hod/review/${resolvedPublicId}`,
      };
    }
    return {
      authorized: false,
      error: "Request not found or you don't have permission to view it.",
    };
  }

  return {
    authorized: false,
    error: "Request not found or you don't have permission to view it.",
  };
}
