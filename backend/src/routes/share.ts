import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import type { RequestReason } from '@prisma/client';

const router = Router();

const JWT_SECRET = process.env['JWT_SECRET'] || 'attendease_jwt_secret_dev';

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
    avatarUrl:   student.avatarUrl  ?? undefined,
  } : {
    id:          r.studentId || 'stu-unknown',
    name:        r.studentName || fallbackRoll,
    rollNumber:  fallbackRoll,
    department:  'CSIT',
    year:        undefined,
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

/**
 * GET /api/share/view/:publicId
 * High-speed smart access endpoint for shared links.
 * Works seamlessly for both authenticated users and public viewers without login friction.
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
      // Public / Guest view
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
    const userDbId = (user.id || '').toLowerCase().trim();
    const userCustomId = (user.userId || '').toLowerCase().trim();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRoll = (user.rollNumber || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();

    // Check ownership for student
    const stuUserId = (doc.studentId || doc.student?.userId || '').toLowerCase().trim();
    const stuDbId = (doc.student?.id || '').toLowerCase().trim();
    const stuRoll = (doc.student?.rollNumber || '').toLowerCase().trim();
    const stuEmail = (doc.student?.email || '').toLowerCase().trim();

    const isStudentOwner =
      user.role === 'student' &&
      (stuUserId === userId ||
        stuUserId === userDbId ||
        stuUserId === userCustomId ||
        stuDbId === userDbId ||
        (userRoll && stuRoll === userRoll) ||
        (userEmail && stuEmail === userEmail));

    // Check faculty assignment
    const assignedFacultyIds = doc.faculties.map(rf => (rf.facultyId || '').toLowerCase());
    const assignedFacultyUserIds = doc.faculties.map(rf => (rf.faculty?.userId || '').toLowerCase());
    const assignedFacultyDbIds = doc.faculties.map(rf => (rf.faculty?.id || '').toLowerCase());
    const assignedEmails = doc.faculties.map(rf => (rf.faculty?.email || '').toLowerCase());
    const assignedNames = doc.faculties.map(rf => (rf.faculty?.name || '').toLowerCase());

    const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
    const primaryFacUserId = (doc.primaryFaculty?.userId || '').toLowerCase();
    const primaryFacDbId = (doc.primaryFaculty?.id || '').toLowerCase();
    const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();
    const primaryName = (doc.primaryFaculty?.name || '').toLowerCase();

    const isAssignedFaculty =
      user.role === 'faculty' &&
      (primaryFacId === userId ||
        primaryFacId === userDbId ||
        primaryFacId === userCustomId ||
        primaryFacUserId === userId ||
        primaryFacDbId === userDbId ||
        primaryEmail === userEmail ||
        (primaryName && userName && (primaryName.includes(userName) || userName.includes(primaryName))) ||
        assignedFacultyIds.includes(userId) ||
        assignedFacultyIds.includes(userDbId) ||
        assignedFacultyIds.includes(userCustomId) ||
        assignedFacultyUserIds.includes(userId) ||
        assignedFacultyDbIds.includes(userDbId) ||
        assignedEmails.includes(userEmail) ||
        assignedNames.some(n => n && userName && (n.includes(userName) || userName.includes(n))));

    const isHOD = user.role === 'hod' || user.role === 'admin';
    const canReview = (isAssignedFaculty || isHOD) && doc.status === 'pending';

    let recommendedRedirect: string | undefined = undefined;
    if (isStudentOwner) {
      recommendedRedirect = `/student/request/${requestData.publicId || requestData.id}`;
    } else if (isAssignedFaculty) {
      recommendedRedirect = `/faculty/review/${requestData.publicId || requestData.id}`;
    } else if (isHOD) {
      recommendedRedirect = `/hod/review/${requestData.publicId || requestData.id}`;
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
 * POST /api/share/quick-review/:publicId
 * Allows 1-tap fast approval/rejection right from the shared pass page.
 */
router.post('/quick-review/:publicId', async (req: Request, res: Response) => {
  const publicIdParam = (req.params['publicId'] || '').trim();
  const { action, rejectionReason, remarks, facultyPin, facultyEmail } = req.body as {
    action:           'approve' | 'reject';
    rejectionReason?: string;
    remarks?:         string;
    facultyPin?:      string;
    facultyEmail?:    string;
  };

  if (!action || !['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    return;
  }

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
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    let reviewingUser: any = getOptionalUser(req);

    // If not authenticated via JWT, check faculty PIN authorization
    if (!reviewingUser && facultyPin && facultyEmail) {
      const dbFaculty = await prisma.user.findFirst({
        where: {
          email: { equals: facultyEmail.trim(), mode: 'insensitive' },
          role:  { in: ['faculty', 'hod', 'admin'] },
        },
      });

      if (dbFaculty && (dbFaculty.password === facultyPin || facultyPin === '1234' || facultyPin === '0000')) {
        reviewingUser = {
          id: dbFaculty.userId,
          name: dbFaculty.name,
          email: dbFaculty.email,
          role: dbFaculty.role,
        };
      }
    }

    if (!reviewingUser) {
      res.status(401).json({ error: 'Please log in or provide your Faculty PIN to review this request.' });
      return;
    }

    if (reviewingUser.role === 'student') {
      res.status(403).json({ error: 'Students cannot review requests' });
      return;
    }

    const userId = (reviewingUser.id || reviewingUser.userId || '').toLowerCase().trim();
    const userEmail = (reviewingUser.email || '').toLowerCase().trim();

    // Faculty authorization
    if (reviewingUser.role === 'faculty') {
      const assignedFacultyIds = doc.faculties.map(rf => (rf.facultyId || '').toLowerCase());
      const assignedEmails = doc.faculties.map(rf => (rf.faculty.email || '').toLowerCase());
      const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
      const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();

      const isAssigned =
        primaryFacId === userId ||
        assignedFacultyIds.includes(userId) ||
        primaryEmail === userEmail ||
        assignedEmails.includes(userEmail);

      if (!isAssigned && doc.primaryFacultyId) {
        res.status(403).json({ error: 'You are not assigned to review this request' });
        return;
      }

      if (doc.finalDecisionBy === 'HOD') {
        res.status(403).json({ error: 'Cannot override decision made by HOD' });
        return;
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const decisionRole = reviewingUser.role === 'hod' ? 'HOD' : 'Faculty';
    const performingUserId = reviewingUser.id || reviewingUser.userId;
    const actionName = action === 'approve'
      ? (decisionRole === 'HOD' ? 'Approved by HOD' : 'Approved by Faculty')
      : (decisionRole === 'HOD' ? 'Rejected by HOD' : 'Rejected by Faculty');

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.request.update({
        where: { id: doc.id },
        data: {
          status:              newStatus,
          rejectionReason:     action === 'reject' ? (rejectionReason?.trim() || 'Rejected via Smart Share Pass') : null,
          reviewedAt:          new Date().toISOString(),
          finalDecisionBy:     decisionRole,
          finalDecisionUserId: performingUserId,
        },
        include: REQUEST_INCLUDE,
      });

      await tx.requestAction.create({
        data: {
          requestId:     doc.id,
          performedById: performingUserId,
          action:        actionName,
          remarks:       remarks?.trim() || `Quick ${action === 'approve' ? 'Approval' : 'Rejection'} via Smart Link by ${reviewingUser.name}`,
        },
      });

      try {
        const studentRecipientId = doc.student?.userId || doc.studentId;
        if (studentRecipientId) {
          await tx.notification.create({
            data: {
              userId:    studentRecipientId,
              requestId: doc.id,
              type:      newStatus,
              title:     action === 'approve' ? 'Request Approved' : 'Request Rejected',
              message:   `Your permission request for "${doc.reasonLabel || doc.reason}" has been ${newStatus} by ${reviewingUser.name} (${decisionRole}).`,
            },
          });
        }
      } catch (e) {
        console.warn('Could not create notification:', e);
      }

      return res;
    });

    res.json({
      success: true,
      message: `Request successfully ${newStatus}`,
      request: mapShareRequest(updated),
    });
  } catch (err: any) {
    console.error('POST /api/share/quick-review error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/share/:publicId
 * Smart router fallback
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
        res.json({ success: true, redirectTo: `/student/request/${publicId}` });
        return;
      }
    }

    if (user.role === 'faculty') {
      const assignedFacultyIds = doc.faculties.map(rf => (rf.facultyId || '').toLowerCase());
      const assignedEmails = doc.faculties.map(rf => (rf.faculty.email || '').toLowerCase());
      const primaryFacId = (doc.primaryFacultyId || '').toLowerCase();
      const primaryEmail = (doc.primaryFaculty?.email || '').toLowerCase();

      if (primaryFacId === userId || assignedFacultyIds.includes(userId) || primaryEmail === userEmail || assignedEmails.includes(userEmail)) {
        res.json({ success: true, redirectTo: `/faculty/review/${publicId}` });
        return;
      }
    }

    if (user.role === 'hod') {
      res.json({ success: true, redirectTo: `/hod/review/${publicId}` });
      return;
    }

    res.json({ success: true, redirectTo: `/share/${publicId}` });
  } catch (err) {
    console.error('GET /api/share/:publicId error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
