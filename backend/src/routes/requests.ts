import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import type { RequestReason } from '../types.js';
import type { Prisma, RequestStatus } from '@prisma/client';

const router = Router();

// All routes require a valid JWT
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

  return {
    id:                  r.requestId,
    studentId:           r.studentId,
    student: student ? {
      id:          student.userId,
      name:        student.name,
      rollNumber:  student.rollNumber ?? 'N/A',
      department:  student.department,
      semester:    student.semester   ?? 1,
      email:       student.email,
      avatarUrl:   student.avatarUrl  ?? undefined,
    } : undefined,
    reason:              r.reason,
    reasonLabel:         r.reasonLabel,
    date:                r.date,
    startTime:           r.startTime,
    endTime:             r.endTime,
    description:         r.description,
    documentName:        r.documentName ?? undefined,
    status:              r.status,
    submittedAt:         r.submittedAt,
    reviewedAt:          r.reviewedAt   ?? undefined,
    finalDecisionBy:     r.finalDecisionBy ?? undefined,
    finalDecisionUserId: r.finalDecisionUserId ?? undefined,
    facultyId:           r.primaryFacultyId ?? undefined,
    faculty: faculty ? {
      id:          faculty.userId,
      name:        faculty.name,
      department:  faculty.department,
      email:       faculty.email,
      avatarUrl:   faculty.avatarUrl  ?? undefined,
      designation: faculty.designation ?? undefined,
    } : undefined,
    facultyIds: allFacultyRows.map((f: any) => f.userId),
    faculties:  allFacultyRows.map((f: any) => ({
      id:          f.userId,
      name:        f.name,
      department:  f.department,
      email:       f.email,
      avatarUrl:   f.avatarUrl   ?? undefined,
      designation: f.designation ?? undefined,
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

/**
 * GET /api/requests
 * - student : own requests only
 * - faculty : requests assigned to them ONLY (cannot view requests assigned to other faculty)
 * - hod     : all requests for their department with query filters (status, facultyId, studentId, date)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    if ((user.role === 'hod' || user.role === 'faculty') && !user.department) {
      res.status(401).json({
        error: 'Your session is missing required claims. Please log out and log in again.',
      });
      return;
    }

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
      // Faculty can view ONLY requests assigned to them
      where = {
        OR: [
          { primaryFacultyId: user.id },
          { faculties: { some: { facultyId: user.id } } },
          { primaryFaculty: { email: user.email } },
          { faculties: { some: { faculty: { email: user.email } } } },
        ],
      };
    } else if (user.role === 'hod') {
      // HOD can view every request within their department + filter by status, faculty, student, date
      const { status, facultyId, studentId, date } = req.query;

      where = {
        student: { department: user.department },
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
    const doc = await prisma.request.findUnique({
      where:   { requestId: req.params['id'] },
      include: REQUEST_INCLUDE,
    });

    if (!doc) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const user = req.user!;

    // Students can only view their own requests
    if (
      user.role === 'student' &&
      doc.studentId !== user.id &&
      doc.student?.userId !== user.id &&
      doc.student?.rollNumber !== user.rollNumber &&
      doc.student?.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Faculty can only view requests assigned to them
    const assignedFacultyIds = doc.faculties.map(rf => rf.facultyId);
    const assignedEmails     = doc.faculties.map(rf => rf.faculty.email);

    const isAssignedFaculty =
      doc.primaryFacultyId === user.id ||
      assignedFacultyIds.includes(user.id) ||
      doc.primaryFaculty?.email === user.email ||
      assignedEmails.includes(user.email);

    if (user.role === 'faculty' && !isAssignedFaculty) {
      res.status(403).json({ error: 'This request is not assigned to you' });
      return;
    }

    // HOD can only view requests from their own department
    if (user.role === 'hod' && doc.student?.department !== user.department) {
      res.status(403).json({ error: 'This request does not belong to your department' });
      return;
    }

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

  const { reason, date, startTime, endTime, description, documentName, facultyId, facultyIds } = req.body as {
    reason:        string;
    date:          string;
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

    // Load student profile
    const studentUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email:  user.email },
          ...(user.rollNumber ? [{ rollNumber: user.rollNumber }] : []),
          { role: 'student', email: user.email },
        ],
      },
    });

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

    // Fallback: assign any faculty from the same department
    if (facultyDocs.length === 0) {
      const fallback = await prisma.user.findFirst({
        where: { role: 'faculty', department: studentUser.department },
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
  const user = req.user!;
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

  const effectiveRemarks = remarks?.trim() || rejectionReason?.trim() || (action === 'reject' ? `Rejected by ${user.role.toUpperCase()}` : `Approved by ${user.role.toUpperCase()}`);

  try {
    const existing = await prisma.request.findUnique({
      where:   { requestId: req.params['id'] },
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

    // ── HOD authorization ─────────────────────────────────────────────────────
    if (user.role === 'hod' && existing.student?.department !== user.department) {
      res.status(403).json({ error: 'This request does not belong to your department' });
      return;
    }

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

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.request.update({
        where: { requestId: req.params['id'] },
        data: {
          status:              newStatus,
          reviewedAt:          new Date().toISOString(),
          finalDecisionBy:     decisionRole,
          finalDecisionUserId: user.id,
        },
        include: REQUEST_INCLUDE,
      });

      // Record audit action
      await tx.requestAction.create({
        data: {
          requestId:     existing.id,
          performedById: user.id,
          action:        actionName,
          remarks:       effectiveRemarks,
        },
      });

      // Generate Notification for student
      await tx.notification.create({
        data: {
          userId:    existing.studentId,
          requestId: existing.id,
          type:      newStatus,
          title:     `Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message:   `Your request for ${existing.reasonLabel} has been ${newStatus} by ${user.name} (${decisionRole}).`,
        },
      });

      // If HOD override, notify assigned faculty
      if (user.role === 'hod' && assignedFacultyIds.length > 0) {
        await tx.notification.createMany({
          data: assignedFacultyIds.map(facId => ({
            userId:    facId,
            requestId: existing.id,
            type:      'override',
            title:     'HOD Decision Override',
            message:   `HOD ${user.name} updated decision to ${newStatus} for student ${existing.student?.name || 'Student'}.`,
          })),
        });
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

export default router;
