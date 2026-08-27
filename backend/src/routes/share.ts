import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { isValidShareTokenFormat } from '../utils/shareToken.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import type { RequestReason } from '@prisma/client';

const router = Router();

const JWT_SECRET = process.env['JWT_SECRET'] || 'attendease_dev_secret_key_2026';

const REQUEST_INCLUDE = {
  student:        true,
  primaryFaculty: true,
  faculties:      { include: { faculty: true } },
  actions:        { include: { performedBy: true }, orderBy: { performedAt: 'asc' as const } },
} as const;

const REASON_LABELS: Record<string, string> = {
  internship:          'Internship',
  startup:             'Startup Work',
  project_development: 'Project Development',
  medical:             'Medical Leave',
  sports:              'Sports Event',
  family_emergency:    'Family Emergency',
  competition:         'Competition',
  other:               'Other',
};

/** Convert a Prisma request row to standard frontend API shape */
function mapShareRequest(r: any) {
  const student = r.student;
  const faculty = r.primaryFaculty;
  const allFacultyRows = r.faculties ? r.faculties.map((rf: any) => rf.faculty).filter(Boolean) : [];
  const fallbackRoll = r.studentId?.startsWith('stu-') ? r.studentId.replace('stu-', '').toUpperCase() : (r.studentId || 'STUDENT');

  const studentObj = student ? {
    id:          student.userId,
    name:        student.name,
    rollNumber:  student.rollNumber ?? fallbackRoll,
    department:  student.department ?? 'CSIT',
    year:        student.year       ?? undefined,
    semester:    student.semester   ?? 1,
    email:       student.email,
    avatarUrl:   student.avatarUrl  || (student.rollNumber ? `https://srkrexams.in/SRKR/photo/${student.rollNumber.toUpperCase()}.jpg` : (fallbackRoll ? `https://srkrexams.in/SRKR/photo/${fallbackRoll.toUpperCase()}.jpg` : undefined)),
  } : {
    id:          r.studentId || 'stu-unknown',
    name:        r.studentName || fallbackRoll,
    rollNumber:  fallbackRoll,
    department:  'CSIT',
    year:        undefined,
    semester:    1,
    email:       `${fallbackRoll.toLowerCase()}@srkrec.ac.in`,
    avatarUrl:   fallbackRoll ? `https://srkrexams.in/SRKR/photo/${fallbackRoll.toUpperCase()}.jpg` : undefined,
  };

  const facultyObj = faculty ? {
    id:          faculty.userId,
    name:        faculty.name,
    department:  faculty.department,
    email:       faculty.email,
    avatarUrl:   faculty.avatarUrl  ?? undefined,
  } : (allFacultyRows.length > 0 ? {
    id:          allFacultyRows[0].userId,
    name:        allFacultyRows[0].name,
    department:  allFacultyRows[0].department,
    email:       allFacultyRows[0].email,
    avatarUrl:   allFacultyRows[0].avatarUrl ?? undefined,
  } : {
    id:          r.primaryFacultyId || 'fac-001',
    name:        'Department Faculty',
    department:  'CSIT',
    email:       'faculty@srkrec.ac.in',
    avatarUrl:   undefined,
  });

  const lastDecisionAction = r.actions && r.actions.length > 0
    ? [...r.actions].reverse().find((act: any) =>
        act.action?.includes('Approved') || act.action?.includes('Rejected') || act.action?.includes('Overridden')
      )
    : null;

  let finalDecisionName = lastDecisionAction?.performedBy?.name;

  if (!finalDecisionName && r.finalDecisionUserId) {
    if (r.primaryFaculty && (r.primaryFaculty.userId === r.finalDecisionUserId || r.primaryFaculty.id === r.finalDecisionUserId)) {
      finalDecisionName = r.primaryFaculty.name;
    } else {
      const matchInFaculties = allFacultyRows.find((f: any) => f && (f.userId === r.finalDecisionUserId || f.id === r.finalDecisionUserId));
      if (matchInFaculties) {
        finalDecisionName = matchInFaculties.name;
      }
    }
  }

  if (!finalDecisionName) {
    if (r.finalDecisionBy === 'HOD') {
      finalDecisionName = 'HOD';
    } else if (r.finalDecisionBy === 'Faculty') {
      finalDecisionName = faculty?.name || (allFacultyRows.length > 0 ? allFacultyRows[0].name : 'Faculty');
    }
  }

  return {
    id:                  r.requestId,
    publicId:            r.publicId ?? r.requestId,
    studentId:           r.studentId,
    student:             studentObj,
    reason:              r.reason,
    reasonLabel:         r.reasonLabel || REASON_LABELS[r.reason] || r.reason,
    date:                r.date,
    endDate:             r.endDate ?? undefined,
    periods:             r.periods ?? undefined,
    startTime:           r.startTime,
    endTime:             r.endTime,
    description:         r.description,
    documentName:        r.documentName ?? undefined,
    documentUrl:         r.documentUrl  ?? (r.documentName?.startsWith('http') ? r.documentName : undefined),
    status:              r.status,
    rejectionReason:     r.rejectionReason ?? undefined,
    submittedAt:         r.submittedAt,
    reviewedAt:          r.reviewedAt   ?? undefined,
    finalDecisionBy:     r.finalDecisionBy ?? undefined,
    finalDecisionUserId: r.finalDecisionUserId ?? undefined,
    finalDecisionName:   finalDecisionName || undefined,
    facultyId:           r.primaryFacultyId ?? undefined,
    faculty:             facultyObj,
    facultyIds:          allFacultyRows.map((f: any) => f.userId),
    faculties:           allFacultyRows.map((f: any) => ({
      id:          f.userId,
      name:        f.name,
      department:  f.department,
      email:       f.email,
      avatarUrl:   f.avatarUrl   ?? undefined,
    })),
    actions: r.actions ? r.actions.map((act: any) => ({
      id:          act.id,
      action:      act.action,
      remarks:     act.remarks ?? undefined,
      performedAt: act.performedAt,
      performedBy: {
        id:   act.performedBy?.userId || act.performedById,
        name: act.performedBy?.name || 'User',
        role: act.performedBy?.role,
      },
    })) : [],
  };
}

/** Helper to extract optional logged-in user from Bearer Token without rejecting unauthenticated users */
function getOptionalUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload || null;
  } catch {
    return null;
  }
}

// ── Rate Limiter for Token Resolution (Max 60 requests per 15 minutes per IP) ──
const shareRateLimiter = rateLimiter(15 * 60 * 1000, 60);

import { authorizeRequestViewer } from '../services/requestAuth.js';

/**
 * Core Share Token Resolution Handler
 * 
 * Rules:
 * 1. Validates token format.
 * 2. Looks up share link record strictly by exact token (active, unrevoked, unexpired).
 * 3. Never leaks request data if unauthenticated or unauthorized.
 * 4. Unauthenticated -> 401 with redirectUrl: /login?redirect=/r/:shareToken
 * 5. Uses canonical request authorization service (isStudentOwnerOfRequest, isFacultyAuthorizedForRequest, isHodAuthorizedForRequest, isAdminAuthorizedForRequest).
 * 6. Returns decoupled destination and authorization result.
 */
async function handleShareTokenResolution(req: Request, res: Response) {
  const shareToken = (req.params['shareToken'] || '').trim();

  // 1. Format validation
  if (!isValidShareTokenFormat(shareToken)) {
    res.status(404).json({
      success: false,
      error: "Request not found or you don't have permission to view it.",
    });
    return;
  }

  try {
    // 2. Query share link record strictly via dedicated share token table (exact case-sensitive match)
    const shareLink = await (prisma as any).permissionRequestShareLink.findUnique({
      where: { token: shareToken },
      include: {
        request: {
          include: REQUEST_INCLUDE,
        },
      },
    });

    if (!shareLink || !shareLink.request) {
      res.status(404).json({
        success: false,
        error: "Request not found or you don't have permission to view it.",
      });
      return;
    }

    // 3. Revocation & Expiration checks
    if (!shareLink.isActive || shareLink.revokedAt) {
      res.status(404).json({
        success: false,
        error: 'This sharing link is no longer available.',
        isRevoked: true,
      });
      return;
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      res.status(404).json({
        success: false,
        error: 'This sharing link is no longer available.',
        isExpired: true,
      });
      return;
    }

    // 4. Authentication check
    const user = getOptionalUser(req) || req.user;

    if (!user) {
      // Unauthenticated user -> NEVER expose request details
      res.status(401).json({
        success: false,
        authenticated: false,
        redirectUrl: `/login?redirect=/r/${encodeURIComponent(shareToken)}`,
        message: 'Please log in to view this request.',
      });
      return;
    }

    // 5. Backend Authorization check via Canonical Authorization Service
    const authResult = authorizeRequestViewer(shareLink.request, user as any);

    if (!authResult.authorized) {
      // Unauthorized -> Generic 403 (Zero information disclosure)
      res.status(403).json({
        success: false,
        authorized: false,
        error: "Request not found or you don't have permission to view it.",
      });
      return;
    }

    // Update last accessed timestamp asynchronously
    (prisma as any).permissionRequestShareLink.update({
      where: { id: shareLink.id },
      data: { lastAccessedAt: new Date() },
    }).catch((err: any) => console.warn('Could not update lastAccessedAt:', err));

    res.json({
      success: true,
      ...authResult,
    });
  } catch (err: any) {
    console.error('handleShareTokenResolution error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

/**
 * GET /api/share/token/:shareToken
 * GET /api/share/resolve/:shareToken
 * Dedicated share token resolution endpoints.
 */
router.get('/token/:shareToken', shareRateLimiter, handleShareTokenResolution);
router.get('/resolve/:shareToken', shareRateLimiter, handleShareTokenResolution);

/**
 * POST /api/share/revoke/:shareToken
 * Allows student owner or admin/HOD to revoke a share token.
 */
router.post('/revoke/:shareToken', async (req: Request, res: Response) => {
  const shareToken = (req.params['shareToken'] || '').trim();
  const user = getOptionalUser(req);

  if (!user) {
    res.status(401).json({ error: 'Authentication required to revoke share link.' });
    return;
  }

  try {
    const shareLink = await (prisma as any).permissionRequestShareLink.findUnique({
      where: { token: shareToken },
      include: { request: true },
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Share link not found.' });
      return;
    }

    const userId = (user.id || user.userId || '').toLowerCase().trim();
    const isOwner = shareLink.createdBy.toLowerCase().trim() === userId || (shareLink.request && shareLink.request.studentId.toLowerCase().trim() === userId);
    const isAdminOrHod = user.role === 'admin' || user.role === 'hod';

    if (!isOwner && !isAdminOrHod) {
      res.status(403).json({ error: 'You are not authorized to revoke this share link.' });
      return;
    }

    await (prisma as any).permissionRequestShareLink.update({
      where: { id: shareLink.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'This sharing link is no longer available.',
    });
  } catch (err: any) {
    console.error('POST /api/share/revoke/:shareToken error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/share/view/:publicId (Legacy publicId viewer)
 */
router.get('/view/:publicId', async (req: Request, res: Response) => {
  const publicIdParam = (req.params['publicId'] || '').trim();

  try {
    const doc = await prisma.request.findFirst({
      where: {
        OR: [
          { publicId:  { equals: publicIdParam, mode: 'insensitive' } },
          { requestId: { equals: publicIdParam, mode: 'insensitive' } },
          { id:        { equals: publicIdParam, mode: 'insensitive' } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!doc) {
      res.status(404).json({ success: false, status: 404, error: 'Permission request not found' });
      return;
    }

    const requestData = mapShareRequest(doc);
    const user = getOptionalUser(req);

    if (!user) {
      res.json({
        success: true,
        request: requestData,
        authInfo: {
          isGuest: true,
          canReview: false,
          isStudentOwner: false,
          role: 'guest',
        },
      });
      return;
    }

    const userId = (user.id || user.userId || '').toLowerCase().trim();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRoll = (user.rollNumber || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();

    const stuUserId = (doc.studentId || doc.student?.userId || '').toLowerCase().trim();
    const stuRoll = (doc.student?.rollNumber || '').toLowerCase().trim();
    const stuEmail = (doc.student?.email || '').toLowerCase().trim();

    const isStudentOwner =
      user.role === 'student' &&
      (stuUserId === userId ||
        (userRoll && stuRoll === userRoll) ||
        (userEmail && stuEmail === userEmail));

    const assignedFacultyIds = doc.faculties.map((rf: any) => (rf.facultyId || '').toLowerCase());
    const assignedEmails = doc.faculties.map((rf: any) => (rf.faculty?.email || '').toLowerCase());
    const assignedNames = doc.faculties.map((rf: any) => (rf.faculty?.name || '').toLowerCase());

    const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
    const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();
    const primaryName = (doc.primaryFaculty?.name || '').toLowerCase();

    const isAssignedFaculty =
      user.role === 'faculty' &&
      (primaryFacId === userId ||
        primaryEmail === userEmail ||
        (primaryName && userName && (primaryName.includes(userName) || userName.includes(primaryName))) ||
        assignedFacultyIds.includes(userId) ||
        assignedEmails.includes(userEmail) ||
        assignedNames.some((n: string) => n && userName && (n.includes(userName) || userName.includes(n))));

    const isHOD = user.role === 'hod' || user.role === 'admin';
    const canReview = (isAssignedFaculty || isHOD) && doc.status === 'pending';

    let recommendedRedirect: string | undefined = undefined;
    if (isStudentOwner) {
      recommendedRedirect = '/student/history';
    } else if (isAssignedFaculty) {
      recommendedRedirect = '/faculty/requests';
    } else if (isHOD) {
      recommendedRedirect = '/hod/requests';
    }

    res.json({
      success: true,
      request: requestData,
      authInfo: {
        isGuest: false,
        user: {
          id: user.id || user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        isStudentOwner,
        isAssignedFaculty,
        isHOD,
        canReview,
        recommendedRedirect,
      },
    });
  } catch (err: any) {
    console.error('GET /api/share/view/:publicId error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/share/:publicId (Smart router fallback)
 */
router.get('/:publicId', async (req: Request, res: Response) => {
  const publicIdParam = (req.params['publicId'] || '').trim();
  const user = getOptionalUser(req);

  try {
    const doc = await prisma.request.findFirst({
      where: {
        OR: [
          { publicId:  { equals: publicIdParam, mode: 'insensitive' } },
          { requestId: { equals: publicIdParam, mode: 'insensitive' } },
          { id:        { equals: publicIdParam, mode: 'insensitive' } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!doc) {
      res.status(404).json({ success: false, status: 404, error: 'Request not found' });
      return;
    }

    const publicId = doc.publicId || doc.requestId;

    if (!user) {
      res.json({ success: true, redirectTo: `/share/${publicId}` });
      return;
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const userId = (user.id || user.userId || '').toLowerCase().trim();

    if (user.role === 'student') {
      const userRoll = (user.rollNumber || '').toLowerCase().trim();
      const stuUserId = (doc.studentId || doc.student?.userId || '').toLowerCase().trim();
      const stuRoll = (doc.student?.rollNumber || '').toLowerCase().trim();
      const stuEmail = (doc.student?.email || '').toLowerCase().trim();

      if (stuUserId === userId || (userRoll && stuRoll === userRoll) || (userEmail && stuEmail === userEmail)) {
        res.json({ success: true, redirectTo: '/student/history' });
        return;
      }
    }

    if (user.role === 'faculty') {
      const assignedFacultyIds = doc.faculties.map((rf: any) => (rf.facultyId || '').toLowerCase());
      const assignedEmails = doc.faculties.map((rf: any) => (rf.faculty.email || '').toLowerCase());
      const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
      const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();

      if (primaryFacId === userId || assignedFacultyIds.includes(userId) || primaryEmail === userEmail || assignedEmails.includes(userEmail)) {
        res.json({ success: true, redirectTo: '/faculty/requests' });
        return;
      }
    }

    if (user.role === 'hod' || user.role === 'admin') {
      res.json({ success: true, redirectTo: '/hod/requests' });
      return;
    }

    res.json({ success: true, redirectTo: `/share/${publicId}` });
  } catch (err) {
    console.error('GET /api/share/:publicId error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
