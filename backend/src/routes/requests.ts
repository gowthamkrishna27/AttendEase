import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import type { RequestReason } from '../types.js';
import type { Prisma, RequestStatus } from '@prisma/client';

const router = Router();

// Public endpoint for permissions page viewer & attendance pre-highlighting
router.get('/public-approved', async (req: Request, res: Response) => {
  try {
    const { date, department, section, year } = req.query;

    const where: Prisma.RequestWhereInput = {
      status: 'approved',
      ...(date && { date: String(date).trim() }),
    };

    const requests = await prisma.request.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { date: 'desc' },
    });

    let filtered = requests.map(toApi);

    // Filter by department if specified
    if (department && typeof department === 'string' && department.trim() && department !== 'all') {
      const depNorm = department.trim().toLowerCase();
      filtered = filtered.filter(r => (r.student?.department || '').toLowerCase() === depNorm);
    }

    // Filter by section if specified ('CSD-A', 'CSIT-A', 'CSIT-B', 'A', 'B', etc.)
    if (section && typeof section === 'string' && section.trim() && section !== 'none' && section !== 'all') {
      const secNorm = section.trim().toUpperCase();
      const isSecB = secNorm.includes('B') || secNorm === 'CSIT-B';
      filtered = filtered.filter(r => {
        const studentSec = ((r.student as any)?.section || '').toUpperCase();
        if (studentSec) {
          return studentSec === secNorm || secNorm.includes(studentSec) || studentSec.includes(secNorm);
        }
        // Fallback: derive from roll number
        const roll = (r.student?.rollNumber || r.studentId || '').toUpperCase();
        const isRollB = /^(7[3-9]|[89]\d|A\d|B\d|C\d|D[01]|LE\d+)$/i.test(roll) || roll.endsWith('-B');
        return isSecB ? isRollB : !isRollB;
      });
    }

    // Filter by year if specified ('1st Year', '2nd Year', '3rd Year', '4th Year', '1', '2', '3', '4', etc.)
    if (year && typeof year === 'string' && year.trim() && year !== 'all') {
      const yrNorm = year.trim().toLowerCase();
      const yearDigitMatch = yrNorm.match(/([1-4])/);
      const targetNum = yearDigitMatch ? yearDigitMatch[1] : '';

      filtered = filtered.filter(r => {
        const reqYear = ((r.student as any)?.year || '').toLowerCase();
        if (reqYear) {
          if (reqYear === yrNorm) return true;
          if (targetNum && reqYear.includes(targetNum)) return true;
        }
        const sem = r.student?.semester;
        if (sem && typeof sem === 'number' && targetNum) {
          const derivedYear = String(Math.ceil(sem / 2));
          return derivedYear === targetNum;
        }
        return !targetNum || targetNum === '3';
      });
    }

    res.json({ requests: filtered });
  } catch (error) {
    console.error('Error fetching public approved requests:', error);
    res.status(500).json({ error: 'Failed to fetch public approved requests' });
  }
});

// All other routes require a valid JWT
router.use(verifyToken);

const REASON_LABELS: Record<RequestReason, string> = {
  internship:       'Internship',
  medical:          'Medical Leave',
  sports:           'Sports Event',
  family_emergency: 'Family Emergency',
  competition:      'Competition',
  other:            'Other',
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
    periods:             r.periods ?? undefined,
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

    let facultyDocs: { userId: string }[] = [];
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

    res.status(201).json({ request: toApi(newDoc!) });
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error creating request' });
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
  const isHodOrAdmin = user.role === 'hod' || user.role === 'admin' || roleOverride === 'hod' || (user.role as string) === 'viewer';

  if (isHodOrAdmin) {
    user = { ...user, role: 'hod' };
  }

  if (user.role === 'student') {
    res.status(403).json({ error: 'Students cannot review requests' });
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

  const effectiveRemarks = remarks?.trim() || rejectionReason?.trim() || (action === 'reject' ? `Rejected by ${user.role.toUpperCase()} Override` : `Approved by ${user.role.toUpperCase()} Override`);

  try {
    const idParam = (req.params['id'] || '').trim();
    const existing = await prisma.request.findFirst({
      where: {
        OR: [
          { id:        { equals: idParam, mode: 'insensitive' } },
          { requestId: { equals: idParam, mode: 'insensitive' } },
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
          rejectionReason:     action === 'reject' ? (rejectionReason?.trim() || 'Rejected by HOD Executive Override') : null,
          reviewedAt:          new Date().toISOString(),
          finalDecisionBy:     decisionRole,
          finalDecisionUserId: performingUserId,
        },
        include: REQUEST_INCLUDE,
      });

      const previousDecisionText = existing.finalDecisionBy
        ? `${existing.status.toUpperCase()} by ${existing.finalDecisionBy}`
        : existing.status.toUpperCase();
      const newDecisionText = `${newStatus.toUpperCase()} by ${decisionRole}`;
      const logTimestamp = new Date().toISOString();

      const auditRemarks = `[Override Log] Previous: ${previousDecisionText} -> New: ${newDecisionText} | PerformedBy: ${performingUserId} | At: ${logTimestamp}. ${effectiveRemarks}`;

      // Record audit action (performedById references User.userId)
      await tx.requestAction.create({
        data: {
          requestId:     existing.id,
          performedById: performingUserId,
          action:        actionName,
          remarks:       auditRemarks,
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
