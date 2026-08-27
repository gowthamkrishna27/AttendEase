import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import type { RequestReason } from '../types.js';
import type { Prisma, RequestStatus } from '@prisma/client';
import { sendFcmNotification } from '../services/fcm.service.js';
import { isStudentOwnerOfRequest, isFacultyAuthorizedForRequest } from '../services/requestAuth.js';
import { generateShareToken } from '../utils/shareToken.js';

const router = Router();

// Public endpoint for permissions page viewer (no JWT required)
router.get('/public-approved', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      where: { status: 'approved' },
      include: REQUEST_INCLUDE,
      orderBy: { date: 'desc' },
    });
    res.json({ requests: requests.map(toApi) });
  } catch (error) {
    console.error('Error fetching public approved requests:', error);
    res.status(500).json({ error: 'Failed to fetch public approved requests' });
  }
});

// All other routes require a valid JWT
router.use(verifyToken);

const REASON_LABELS: Record<RequestReason, string> = {
  internship:          'Internship',
  startup:             'Startup Work',
  project_development: 'Project Development',
  medical:             'Medical Leave',
  sports:              'Sports Event',
  family_emergency:    'Family Emergency',
  competition:         'Competition',
  other:               'Other',
};

// Shared include for all request queries including actions audit trail
const REQUEST_INCLUDE = {
  student:        true,
  primaryFaculty: true,
  faculties:      { include: { faculty: true } },
  actions:        { include: { performedBy: true }, orderBy: { performedAt: 'asc' as const } },
} as const;

/** Convert a Prisma request row (with relations) to the frontend API shape */
function toApi(r: any) {
  const student = r.student;
  const faculty = r.primaryFaculty;
  const allFacultyRows = r.faculties ? r.faculties.map((rf: any) => rf.faculty) : [];
  const fallbackRoll = r.studentId?.startsWith('stu-') ? r.studentId.replace('stu-', '').toUpperCase() : (r.studentId || 'STUDENT');

  const studentObj = student ? {
    id:          student.userId,
    name:        student.name,
    rollNumber:  student.rollNumber ?? fallbackRoll,
    department:  student.department ?? 'CSIT',
    semester:    student.semester   ?? 1,
    email:       student.email,
    avatarUrl:   student.avatarUrl  ?? undefined,
  } : {
    id:          r.studentId || 'stu-unknown',
    name:        r.studentName || fallbackRoll,
    rollNumber:  fallbackRoll,
    department:  'CSIT',
    semester:    1,
    email:       `${fallbackRoll.toLowerCase()}@srkrec.ac.in`,
    avatarUrl:   undefined,
  };

  const facultyObj = faculty ? {
    id:          faculty.userId,
    name:        faculty.name,
    department:  faculty.department,
    email:       faculty.email,
    avatarUrl:   faculty.avatarUrl  ?? undefined,
  } : {
    id:          r.primaryFacultyId || 'fac-001',
    name:        'Department Faculty',
    department:  'CSIT',
    email:       'faculty@srkrec.ac.in',
    avatarUrl:   undefined,
  };

  const base = {
    id:                  r.requestId,
    studentId:           r.studentId,
    student:             studentObj,
    reason:              r.reason,
    reasonLabel:         r.reasonLabel,
    date:                r.date,
    endDate:             r.endDate ?? undefined,
    periods:             r.grantedPeriods || r.periods || undefined,
    grantedPeriods:      r.grantedPeriods ?? undefined,
    originalPeriods:     r.periods ?? undefined,
    startTime:           r.startTime,
    endTime:             r.endTime,
    description:         r.description,
    documentName:        r.documentName ?? undefined,
    status:              r.status,
    rejectionReason:     r.rejectionReason ?? undefined,
    submittedAt:         r.submittedAt,
    reviewedAt:          r.reviewedAt   ?? undefined,
    finalDecisionBy:     r.finalDecisionBy ?? undefined,
    finalDecisionUserId: r.finalDecisionUserId ?? undefined,
    facultyId:           r.primaryFacultyId ?? undefined,
    faculty:             facultyObj,
    facultyIds: allFacultyRows.map((f: any) => f.userId),
    faculties:  allFacultyRows.map((f: any) => ({
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

  // Find the exact Faculty or HOD user who approved/rejected this request
  const lastDecisionAction = r.actions && r.actions.length > 0
    ? [...r.actions].reverse().find((act: any) =>
        act.action?.includes('Approved') || act.action?.includes('Rejected') || act.action?.includes('Overridden')
      )
    : null;

  const finalDecisionName = lastDecisionAction?.performedBy?.name || (r.finalDecisionBy === 'HOD' ? 'HOD' : (r.primaryFaculty?.name || 'Faculty'));

  return {
    ...base,
    finalDecisionName,
  };
}

/**
 * GET /api/requests
 * - student : own requests only
 * - faculty : requests assigned to them ONLY (cannot view requests assigned to other faculty)
 * - hod     : all requests for their department with query filters (status, facultyId, studentId, date)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const user = req.user!;

    let where: Prisma.RequestWhereInput = {};

    if (user.role === 'student') {
      where = {
        student: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
            ...(user.rollNumber ? [{ rollNumber: user.rollNumber }] : []),
          ],
        },
      };
    } else if (user.role === 'faculty') {
      // Faculty can ONLY view requests specifically assigned to them
      where = {
        OR: [
          { primaryFacultyId: user.id },
          { faculties: { some: { facultyId: user.id } } },
          { primaryFaculty: { email: { equals: user.email, mode: 'insensitive' as const } } },
          { faculties: { some: { faculty: { email: { equals: user.email, mode: 'insensitive' as const } } } } },
        ],
      };
    } else {
      // HOD / Admin / Viewer: view all requests with optional status, faculty, student, date filters
      const { status, facultyId, studentId, date } = req.query;

      where = {
        ...(status && { status: status as RequestStatus }),
        ...(date && { date: String(date) }),
        ...(studentId && {
          OR: [
            { studentId: String(studentId) },
            { student: { userId: String(studentId) } },
            { student: { rollNumber: String(studentId) } },
          ],
        }),
        ...(facultyId && {
          OR: [
            { primaryFacultyId: String(facultyId) },
            { faculties: { some: { facultyId: String(facultyId) } } },
          ],
        }),
      };
    }

    const docs = await prisma.request.findMany({
      where,
      include:  REQUEST_INCLUDE,
      orderBy:  { submittedAt: 'desc' },
    });

    res.json({ requests: docs.map(toApi) });
  } catch (err) {
    console.error('GET /requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/requests/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const idParam = (req.params['id'] || '').trim();
    const doc = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        { equals: idParam, mode: 'insensitive' } },
          { requestId: { equals: idParam, mode: 'insensitive' } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!doc) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const user = req.user!;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userId = (user.id || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();

    // Students can only view their own requests
    if (user.role === 'student') {
      const stuUserId = (doc.studentId || doc.student?.userId || '').toLowerCase().trim();
      const stuRoll = (doc.student?.rollNumber || '').toLowerCase().trim();
      const stuEmail = (doc.student?.email || '').toLowerCase().trim();
      const userRoll = (user.rollNumber || '').toLowerCase().trim();

      const isStudentMatch =
        stuUserId === userId ||
        (userRoll && stuRoll === userRoll) ||
        (userEmail && stuEmail === userEmail);

      if (!isStudentMatch) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    // Faculty can view requests assigned to them
    if (user.role === 'faculty') {
      const assignedFacultyIds = doc.faculties.map(rf => (rf.facultyId || '').toLowerCase());
      const assignedEmails     = doc.faculties.map(rf => (rf.faculty.email || '').toLowerCase());
      const assignedNames      = doc.faculties.map(rf => (rf.faculty.name || '').toLowerCase());

      const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
      const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();
      const primaryName  = (doc.primaryFaculty?.name || '').toLowerCase();

      const isAssignedFaculty =
        (primaryFacId && primaryFacId === userId) ||
        assignedFacultyIds.includes(userId) ||
        (primaryEmail && primaryEmail === userEmail) ||
        assignedEmails.includes(userEmail) ||
        (primaryName && primaryName.includes(userName)) ||
        assignedNames.some(n => n.includes(userName) || userName.includes(n));

      if (!isAssignedFaculty) {
        res.status(403).json({ error: 'This request is not assigned to you' });
        return;
      }
    }

    // HOD can view any request across the system without restriction to perform executive reviews


    res.json({ request: toApi(doc) });
  } catch (err) {
    console.error('GET /requests/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/requests — student creates a new request
 */
router.post('/', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only students can submit requests' });
    return;
  }

  const { reason, date, endDate, periods, startTime, endTime, description, documentName, facultyId, facultyIds } = req.body as {
    reason:        string;
    date:          string;
    endDate?:      string;
    periods?:      string;
    startTime:     string;
    endTime:       string;
    description:   string;
    documentName?: string;
    facultyId?:    string;
    facultyIds?:   string[];
  };

  if (!reason || !date || !startTime || !endTime || !description) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    // Normalize reason enum value safely
    const rawReason = String(reason).trim().toLowerCase().replace(/\s+/g, '_');
    const validReasons: RequestReason[] = ['internship', 'medical', 'sports', 'family_emergency', 'competition', 'other'];
    const safeReason: RequestReason = validReasons.includes(rawReason as RequestReason)
      ? (rawReason as RequestReason)
      : 'other';

    // Load student profile with fallback
    let studentUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: { equals: user.id, mode: 'insensitive' as const } },
          { email:  { equals: user.email, mode: 'insensitive' as const } },
          ...(user.rollNumber ? [{ rollNumber: { equals: user.rollNumber, mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (!studentUser) {
      studentUser = await prisma.user.findFirst({
        where: { role: 'student' },
      });
    }

    if (!studentUser) {
      res.status(400).json({ error: 'Student record not found. Please log in again.' });
      return;
    }

    // Resolve list of faculty IDs
    const targetIds = Array.isArray(facultyIds) && facultyIds.length > 0
      ? facultyIds
      : facultyId ? [facultyId] : [];

    let facultyDocs: { userId: string; fcmToken?: string | null }[] = [];
    if (targetIds.length > 0) {
      facultyDocs = await prisma.user.findMany({
        where: {
          OR: [
            { userId: { in: targetIds } },
            { email:  { in: targetIds } },
          ],
        },
      });
    }

    // Fallback: assign any faculty member
    if (facultyDocs.length === 0) {
      const fallback = await prisma.user.findFirst({
        where: { role: 'faculty' },
      });
      if (fallback) facultyDocs = [fallback];
    }

    // Collision-safe requestId
    const tsHex   = Date.now().toString(36).toUpperCase();
    const randHex = Math.random().toString(36).slice(2, 6).toUpperCase();
    const requestId = `req-${tsHex}-${randHex}`;

    const primaryFaculty = facultyDocs[0] ?? null;

    // Create request + audit action + notifications in a single transaction
    const newDoc = await prisma.$transaction(async tx => {
      const created = await tx.request.create({
        data: {
          requestId,
          studentId:        studentUser.userId,
          primaryFacultyId: primaryFaculty?.userId ?? null,
          reason:           safeReason,
          reasonLabel:      REASON_LABELS[safeReason] ?? String(reason),
          date,
          ...(endDate && { endDate }),
          ...(periods && { periods }),
          startTime,
          endTime,
          description,
          status:           'pending',
          submittedAt:      new Date().toISOString(),
          ...(documentName && { documentName }),
        },
      });

      if (facultyDocs.length > 0) {
        await tx.requestFaculty.createMany({
          data: facultyDocs.map(f => ({
            requestId: created.id,
            facultyId: f.userId,
          })),
          skipDuplicates: true,
        });
      }

      // Record audit action
      await tx.requestAction.create({
        data: {
          requestId:     created.id,
          performedById: studentUser.userId,
          action:        'Submitted',
          remarks:       'Request submitted by student',
        },
      });

      // Generate notification for assigned faculty
      if (facultyDocs.length > 0) {
        await tx.notification.createMany({
          data: facultyDocs.map(f => ({
            userId:    f.userId,
            requestId: created.id,
            type:      'pending',
            title:     'New Attendance Request',
            message:   `${studentUser.name} submitted a new request for ${REASON_LABELS[safeReason] ?? reason}.`,
          })),
        });
      }

      return tx.request.findUnique({
        where:   { id: created.id },
        include: REQUEST_INCLUDE,
      });
    });

    // FCM Dispatch #1: Send push notification to assigned Faculty
    if (newDoc && facultyDocs.length > 0) {
      for (const fac of facultyDocs) {
        if (fac.fcmToken) {
          sendFcmNotification(
            fac.fcmToken,
            'New Attendance Request',
            `${studentUser.name} submitted a new attendance request requiring your approval.`,
            {
              requestId: newDoc.id,
              role: 'faculty',
              notificationType: 'new_request',
            },
            fac.userId
          ).catch(e => console.error('[FCM] Error sending faculty push notification:', e));
        }
      }
    }

    res.status(201).json({ request: toApi(newDoc!) });
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error creating request' });
  }
});

/**
 * GET /api/requests/:id/share-link
 * POST /api/requests/:id/share-link
 * Get or create active share token for a permission request.
 * Authenticated access only.
 */
router.all('/:id/share-link', async (req: Request, res: Response) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const idParam = (req.params['id'] || '').trim();
    const user = req.user!;

    const doc = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        { equals: idParam, mode: 'insensitive' } },
          { requestId: { equals: idParam, mode: 'insensitive' } },
          { publicId:  { equals: idParam, mode: 'insensitive' } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!doc) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const docAny = doc as any;

    // Check ownership for students
    if (user.role === 'student') {
      if (!isStudentOwnerOfRequest(doc, user as any)) {
        res.status(403).json({ error: 'You are not authorized to access share links for this request' });
        return;
      }
    }

    const shareLinksList: any[] = docAny.shareLinks || [];
    let activeLink = shareLinksList.find((l: any) => !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt) > new Date()));

    if (!activeLink) {
      // Attempt creation with up to 3 retries to handle rare token collisions
      let createError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const token = generateShareToken(16); // Use full 16-char entropy
        try {
          activeLink = await (prisma as any).permissionRequestShareLink.create({
            data: {
              requestId: doc.id,
              token,
              createdBy: doc.studentId,
              isActive:  true,
            },
          });
          createError = null;
          break; // Success
        } catch (createErr: any) {
          createError = createErr;
          console.error(`Share link create attempt ${attempt} failed for requestId=${doc.id}:`, createErr?.message || createErr);
          // Only retry on unique constraint violation
          if (!createErr?.message?.includes('unique') && !createErr?.message?.includes('Unique')) break;
        }
      }

      if (!activeLink) {
        console.error('Failed to create share link after retries:', createError);
        res.status(500).json({ error: 'Could not create share link. Please try again.' });
        return;
      }
    }

    const shareUrl = `/r/${activeLink.token}`;
    res.json({
      success: true,
      requestId: doc.requestId,
      shareToken: activeLink.token,
      shareUrl,
      isActive: activeLink.isActive,
      createdAt: activeLink.createdAt,
      expiresAt: activeLink.expiresAt,
    });
  } catch (err) {
    console.error('GET /requests/:id/share-link error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/requests/bulk-review
 * Body: { requestIds: string[], action: 'approve' | 'reject', rejectionReason?: string, remarks?: string }
 * Allows Faculty / HOD to accept or reject multiple requests simultaneously.
 */
router.post('/bulk-review', async (req: Request, res: Response) => {
  let user = req.user!;

  const roleOverride = req.headers['x-role-override'] || (req.body as any)?.roleOverride;
  const isHodOrAdmin = user.role === 'hod' || user.role === 'admin' || roleOverride === 'hod' || (user.role as string) === 'viewer';

  if (isHodOrAdmin) {
    user = { ...user, role: 'hod' };
  }

  if (user.role === 'student') {
    res.status(403).json({ error: 'Students cannot review requests' });
    return;
  }

  const { requestIds, action, rejectionReason, remarks } = req.body as {
    requestIds:        string[];
    action:           'approve' | 'reject';
    rejectionReason?: string;
    remarks?:         string;
  };

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    res.status(400).json({ error: 'requestIds array is required and must not be empty' });
    return;
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'action must be "approve" or "reject"' });
    return;
  }

  try {
    const existingRequests = await prisma.request.findMany({
      where: {
        OR: [
          { id:        { in: requestIds } },
          { requestId: { in: requestIds } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (existingRequests.length === 0) {
      res.status(404).json({ error: 'No matching requests found' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const decisionRole = user.role === 'hod' ? 'HOD' : 'Faculty';
    const performingUserId = (user as any).userId || user.id;
    const now = new Date().toISOString();

    const updatedRequests: any[] = [];
    const skippedIds: string[] = [];

    // Filter eligible requests first (outside transaction to avoid holding locks)
    const eligibleRequests: typeof existingRequests = [];
    for (const existing of existingRequests) {
      if (user.role === 'faculty') {
        const assignedFacultyIds = existing.faculties.map(rf => rf.facultyId);
        const assignedEmails     = existing.faculties.map(rf => rf.faculty.email);

        const isAssignedFaculty =
          existing.primaryFacultyId === user.id ||
          assignedFacultyIds.includes(user.id) ||
          existing.primaryFaculty?.email === user.email ||
          assignedEmails.includes(user.email);

        if (!isAssignedFaculty || existing.finalDecisionBy === 'HOD') {
          skippedIds.push(existing.id);
          continue;
        }
      }
      eligibleRequests.push(existing);
    }

    const actionName = user.role === 'faculty'
      ? (action === 'approve' ? 'Approved by Faculty (Bulk)' : 'Rejected by Faculty (Bulk)')
      : (action === 'approve' ? 'Approved by HOD (Bulk)' : 'Rejected by HOD (Bulk)');

    const effectiveRemarks = remarks?.trim() || rejectionReason?.trim() ||
      (action === 'approve' ? `Bulk approved by ${user.role.toUpperCase()}` : `Bulk rejected by ${user.role.toUpperCase()}`);

    const eligibleIds = eligibleRequests.map(r => r.id);

    await prisma.$transaction(async tx => {
      // Bulk update all eligible requests in one query
      await tx.request.updateMany({
        where: { id: { in: eligibleIds } },
        data: {
          status:              newStatus,
          rejectionReason:     action === 'reject' ? (rejectionReason ?? null) : null,
          reviewedAt:          now,
          finalDecisionBy:     decisionRole,
          finalDecisionUserId: performingUserId,
        },
      });

      // Bulk insert audit actions
      await tx.requestAction.createMany({
        data: eligibleIds.map(id => ({
          requestId:     id,
          performedById: performingUserId,
          action:        actionName,
          remarks:       effectiveRemarks,
        })),
        skipDuplicates: true,
      });

      // Bulk insert student notifications
      await tx.notification.createMany({
        data: eligibleRequests.map(existing => ({
          userId:    existing.studentId,
          requestId: existing.id,
          type:      action === 'approve' ? 'approved' : 'rejected',
          title:     `Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message:   `Your permission request for ${existing.reasonLabel} has been ${action === 'approve' ? 'approved' : 'rejected'} by ${user.name}.`,
        })),
        skipDuplicates: true,
      });
    }, { timeout: 30000 });

    // Fetch updated requests after transaction commits
    const updatedDocs = await prisma.request.findMany({
      where:   { id: { in: eligibleIds } },
      include: REQUEST_INCLUDE,
    });
    updatedRequests.push(...updatedDocs);

    res.json({
      success: true,
      count: updatedRequests.length,
      requests: updatedRequests.map(toApi),
      skippedCount: skippedIds.length,
    });
  } catch (err: any) {
    console.error('POST /requests/bulk-review error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * PUT /api/requests/:id — student updates an existing pending request
 * Rules:
 * 1. Can only update pending requests.
 * 2. If approved (or rejected/cancelled), student CANNOT edit it.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const user = req.user!;
  const idParam = (req.params['id'] || '').trim();

  try {
    const existing = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        { equals: idParam, mode: 'insensitive' } },
          { requestId: { equals: idParam, mode: 'insensitive' } },
          { publicId:  { equals: idParam, mode: 'insensitive' } },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Ownership check for student
    if (user.role === 'student') {
      if (!isStudentOwnerOfRequest(existing, user as any)) {
        res.status(403).json({ error: 'You are not authorized to edit this request' });
        return;
      }

      // Rule: Approved requests CANNOT be edited by student
      if (existing.status === 'approved') {
        res.status(403).json({ error: 'Approved requests cannot be edited by student' });
        return;
      }
    }

    // Authorization check for faculty
    if (user.role === 'faculty') {
      if (!isFacultyAuthorizedForRequest(existing, user as any)) {
        res.status(403).json({ error: 'You are not authorized to edit this request' });
        return;
      }

      // Enforce completed/closed date check
      const targetDateStr = existing.endDate || existing.date;
      if (targetDateStr) {
        const targetDate = new Date(targetDateStr);
        targetDate.setHours(23, 59, 59, 999);
        if (new Date() > targetDate) {
          res.status(400).json({ error: 'Cannot modify a request after its date has completed/closed' });
          return;
        }
      }
    }

    const { reason, date, endDate, periods, startTime, endTime, description, documentName, documentUrl, facultyId, facultyIds } = req.body;

    const rawReason = reason ? String(reason).trim().toLowerCase().replace(/\s+/g, '_') : existing.reason;
    const validReasons: RequestReason[] = ['internship', 'startup', 'project_development', 'medical', 'sports', 'family_emergency', 'competition', 'other'];
    const safeReason: RequestReason = validReasons.includes(rawReason as RequestReason)
      ? (rawReason as RequestReason)
      : existing.reason;

    // Resolve faculty assignments if provided
    let primaryFacultyId = existing.primaryFacultyId;
    const targetFacultyInput = Array.isArray(facultyIds) && facultyIds.length > 0
      ? facultyIds
      : facultyId ? [facultyId] : [];

    let newFacultyDocs: { userId: string }[] = [];
    if (targetFacultyInput.length > 0) {
      newFacultyDocs = await prisma.user.findMany({
        where: {
          OR: [
            { userId: { in: targetFacultyInput } },
            { email:  { in: targetFacultyInput } },
            { id:     { in: targetFacultyInput } },
          ],
        },
      });
    }

    if (newFacultyDocs.length > 0) {
      primaryFacultyId = newFacultyDocs[0].userId;
    }

    const isResubmitting = existing.status === 'rejected' && user.role === 'student';

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.request.update({
        where: { id: existing.id },
        data: {
          ...(isResubmitting ? { status: 'pending', rejectionReason: null, reviewedAt: null, finalDecisionBy: null, finalDecisionUserId: null } : {}),
          ...(reason && { reason: safeReason, reasonLabel: REASON_LABELS[safeReason] ?? String(reason) }),
          ...(date && { date }),
          ...(endDate !== undefined && { endDate }),
          ...(periods !== undefined && user.role === 'student' && { periods }),
          ...(periods !== undefined && user.role === 'faculty' && { grantedPeriods: periods }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(description && { description }),
          ...(documentName !== undefined && { documentName }),
          ...(documentUrl !== undefined && { documentUrl }),
          ...(primaryFacultyId && { primaryFacultyId }),
          // If faculty is saving/editing, automatically approve it
          ...(user.role === 'faculty' && {
            status: 'approved',
            rejectionReason: null,
            reviewedAt: new Date().toISOString(),
            finalDecisionBy: 'Faculty',
            finalDecisionUserId: (user as any).userId || user.id
          })
        },
        include: REQUEST_INCLUDE,
      });

      // Update RequestFaculty junction table so new assigned faculty see the request in their dashboard (only for student updates)
      if (user.role === 'student' && newFacultyDocs.length > 0) {
        await tx.requestFaculty.deleteMany({
          where: { requestId: existing.id },
        });

        await tx.requestFaculty.createMany({
          data: newFacultyDocs.map(f => ({
            requestId: existing.id,
            facultyId: f.userId,
          })),
        });
      }

      // Log audit action
      const actionName = user.role === 'faculty' ? 'Approved by Faculty (Updated Periods)' : 'Updated';
      const remarksText = user.role === 'faculty'
        ? `Permission granted with updated periods: ${periods}`
        : 'Request details and assigned faculty updated by student';

      await tx.requestAction.create({
        data: {
          requestId:     existing.id,
          performedById: (user as any).userId || user.id,
          action:        actionName,
          remarks:       remarksText,
        },
      });

      // Create notification for student if reviewed by faculty
      if (user.role === 'faculty') {
        await tx.notification.create({
          data: {
            userId:    existing.studentId,
            requestId: existing.id,
            type:      'approved',
            title:     'Request Approved with Updated Periods',
            message:   `Your permission request has been approved with updated periods: ${periods} by ${user.name}.`,
          }
        });
      }

      return result;
    });

    res.json({ request: toApi(updated) });
  } catch (err: any) {
    console.error('PUT /requests/:id error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});



/**
 * PATCH /api/requests/:id — faculty / HOD approves or rejects
 * Body: { action: 'approve' | 'reject', rejectionReason?: string, remarks?: string }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  let user = req.user!;

  // Role override from HOD executive control panel
  const roleOverride = req.headers['x-role-override'] || (req.body as any)?.roleOverride;
  if (roleOverride === 'hod' || (user.role as string) === 'viewer') {
    user = { ...user, role: 'hod' };
  }

  if (user.role === 'student') {
    res.status(403).json({ error: 'Students cannot review requests' });
    return;
  }

  if (user.role === 'admin') {
    res.status(403).json({ error: 'System Admins manage users only; attendance requests are reviewed by HOD and Faculty.' });
    return;
  }

  const { action, rejectionReason, remarks } = req.body as {
    action:           'approve' | 'reject';
    rejectionReason?: string;
    remarks?:         string;
  };

  if (!action || !['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'action must be "approve" or "reject"' });
    return;
  }

  const effectiveRemarks = remarks?.trim() || rejectionReason?.trim() || (action === 'reject' ? `Rejected by ${user.role.toUpperCase()}` : `Approved by ${user.role.toUpperCase()}`);

  try {
    const idParam = req.params['id'];
    const existing = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        idParam },
          { requestId: idParam },
        ],
      },
      include: REQUEST_INCLUDE,
    });

    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // ── Faculty authorization & guard ─────────────────────────────────────────
    const assignedFacultyIds = existing.faculties.map(rf => rf.facultyId);
    const assignedEmails     = existing.faculties.map(rf => rf.faculty.email);

    const isAssignedFaculty =
      existing.primaryFacultyId === user.id ||
      assignedFacultyIds.includes(user.id) ||
      existing.primaryFaculty?.email === user.email ||
      assignedEmails.includes(user.email);

    if (user.role === 'faculty') {
      if (!isAssignedFaculty) {
        res.status(403).json({ error: 'This request is not assigned to you' });
        return;
      }

      // Rule #5: Faculty cannot override HOD decisions
      if (existing.finalDecisionBy === 'HOD') {
        res.status(403).json({ error: 'Faculty cannot override a decision made by HOD' });
        return;
      }

      // Enforce completed/closed date check
      const targetDateStr = existing.endDate || existing.date;
      if (targetDateStr) {
        const targetDate = new Date(targetDateStr);
        targetDate.setHours(23, 59, 59, 999);
        if (new Date() > targetDate) {
          res.status(400).json({ error: 'Cannot modify a request after its date has completed/closed' });
          return;
        }
      }
    }

    // HOD & Admin have full executive override authority over any request status


    // ── Determine Action Name & Status ────────────────────────────────────────
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    let actionName: string;

    if (user.role === 'faculty') {
      actionName = action === 'approve' ? 'Approved by Faculty' : 'Rejected by Faculty';
    } else {
      // HOD action: check if overriding a faculty decision
      if (existing.finalDecisionBy === 'Faculty' || (existing.status !== 'pending' && existing.status !== 'cancelled')) {
        actionName = 'Overridden by HOD';
      } else {
        actionName = action === 'approve' ? 'Approved by HOD' : 'Rejected by HOD';
      }
    }

    const decisionRole = user.role === 'hod' ? 'HOD' : 'Faculty';

    const performingUserId = (user as any).userId || user.id;

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.request.update({
        where: { id: existing.id },
        data: {
          status:              newStatus,
          rejectionReason:     action === 'reject' ? (rejectionReason?.trim() || null) : null,
          reviewedAt:          new Date().toISOString(),
          finalDecisionBy:     decisionRole,
          finalDecisionUserId: performingUserId,
        },
        include: REQUEST_INCLUDE,
      });

      // Record audit action (performedById references User.userId)
      await tx.requestAction.create({
        data: {
          requestId:     existing.id,
          performedById: performingUserId,
          action:        actionName,
          remarks:       effectiveRemarks,
        },
      });

      // Safely generate notification for student without breaking transaction
      try {
        const studentRecipientId = existing.student?.userId || existing.studentId;
        if (studentRecipientId) {
          await tx.notification.create({
            data: {
              userId:    studentRecipientId,
              requestId: existing.id,
              type:      newStatus,
              title:     `Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
              message:   `Your request for ${existing.reasonLabel} has been ${newStatus} by ${user.name} (${decisionRole}).`,
            },
          });
        }
      } catch (notifErr) {
        console.warn('Student notification generation skipped:', notifErr);
      }

      // Safely generate notification for assigned faculty if HOD override
      if (user.role === 'hod' && assignedFacultyIds.length > 0) {
        try {
          await tx.notification.createMany({
            data: assignedFacultyIds.map(facId => ({
              userId:    facId,
              requestId: existing.id,
              type:      'override',
              title:     'HOD Decision Override',
              message:   `HOD ${user.name} updated decision to ${newStatus} for student ${existing.student?.name || 'Student'}.`,
            })),
            skipDuplicates: true,
          });
        } catch (facNotifErr) {
          console.warn('Faculty notification generation skipped:', facNotifErr);
        }
      }

      return result;
    });

    // FCM Dispatch #2: Send push notification to Student regarding approval/rejection
    if (updated && existing.student) {
      const studentToken = existing.student.fcmToken;
      if (studentToken) {
        sendFcmNotification(
          studentToken,
          `Attendance Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          `Your request for ${existing.reasonLabel} has been ${newStatus} by ${user.name} (${decisionRole}).`,
          {
            requestId: updated.id,
            role: 'student',
            notificationType: newStatus === 'approved' ? 'approved' : 'rejected',
          },
          existing.studentId
        ).catch(e => console.error('[FCM] Error sending student push notification:', e));
      }
    }

    // FCM Dispatch #3: If Faculty approves/forwards, send push notification to HOD
    if (user.role === 'faculty' && updated) {
      const hodUser = await prisma.user.findFirst({
        where: { role: 'hod', department: user.department },
      });
      if (hodUser?.fcmToken) {
        sendFcmNotification(
          hodUser.fcmToken,
          'Request Forwarded for HOD Review',
          `Attendance request from ${existing.student?.name || 'Student'} has been forwarded for HOD approval.`,
          {
            requestId: updated.id,
            role: 'hod',
            notificationType: 'forwarded_request',
          },
          hodUser.userId
        ).catch(e => console.error('[FCM] Error sending HOD push notification:', e));
      }
    }

    res.json({ request: toApi(updated) });
  } catch (err) {
    console.error('PATCH /requests/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/requests/:id/cancel — student cancels a pending request
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only students can cancel their requests' });
    return;
  }

  try {
    const existing = await prisma.request.findUnique({
      where:   { requestId: req.params['id'] },
      include: REQUEST_INCLUDE,
    });

    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (
      existing.studentId !== user.id &&
      existing.student?.userId !== user.id &&
      existing.student?.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (existing.status === 'cancelled') {
      res.status(400).json({ error: 'Request is already cancelled' });
      return;
    }

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.request.update({
        where: { requestId: req.params['id'] },
        data:  { status: 'cancelled' },
        include: REQUEST_INCLUDE,
      });

      // Audit action
      await tx.requestAction.create({
        data: {
          requestId:     existing.id,
          performedById: user.id,
          action:        'Cancelled',
          remarks:       'Request cancelled by student',
        },
      });

      // Notify faculty
      const assignedFacultyIds = existing.faculties.map(rf => rf.facultyId);
      if (assignedFacultyIds.length > 0) {
        await tx.notification.createMany({
          data: assignedFacultyIds.map(facId => ({
            userId:    facId,
            requestId: existing.id,
            type:      'cancelled',
            title:     'Request Cancelled',
            message:   `Student ${existing.student?.name || 'Student'} cancelled their request for ${existing.reasonLabel}.`,
          })),
        });
      }

      return result;
    });

    res.json({ request: toApi(updated) });
  } catch (err) {
    console.error('POST /requests/:id/cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/requests/:id/actions — retrieve audit timeline for a request
 */
router.get('/:id/actions', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.request.findUnique({
      where: { requestId: req.params['id'] },
      select: { id: true, requestId: true, studentId: true, student: { select: { department: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const actions = await prisma.requestAction.findMany({
      where:   { requestId: existing.id },
      include: { performedBy: true },
      orderBy: { performedAt: 'asc' },
    });

    res.json({
      actions: actions.map(act => ({
        id:          act.id,
        action:      act.action,
        remarks:     act.remarks ?? undefined,
        performedAt: act.performedAt,
        performedBy: {
          id:   act.performedBy.userId,
          name: act.performedBy.name,
          role: act.performedBy.role,
        },
      })),
    });
  } catch (err) {
    console.error('GET /requests/:id/actions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/requests/:id — student cancels/deletes a PENDING request
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const idParam = (req.params['id'] || '').trim();

    const existing = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        { equals: idParam, mode: 'insensitive' } },
          { requestId: { equals: idParam, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Verify ownership
    if (user.role === 'student' && existing.studentId !== user.id) {
      res.status(403).json({ error: 'You are not authorized to delete this request' });
      return;
    }

    // Enforce strict pending status check
    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Only pending requests can be deleted. Approved or rejected requests cannot be deleted.' });
      return;
    }

    // Delete in transaction
    await prisma.$transaction(async tx => {
      await tx.requestAction.deleteMany({ where: { requestId: existing.id } });
      await tx.requestFaculty.deleteMany({ where: { requestId: existing.id } });
      await tx.notification.deleteMany({ where: { requestId: existing.id } });
      await tx.request.delete({ where: { id: existing.id } });
    });

    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('DELETE /requests/:id error:', err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
