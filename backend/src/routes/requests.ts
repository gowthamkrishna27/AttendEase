import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { RequestModel } from '../models/Request.js';
import { UserModel } from '../models/User.js';
import type { RequestReason } from '../types.js';

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

/** Convert a Mongoose request doc to the plain API shape */
function toApi(doc: any) {
  const d = doc;
  return {
    id:              d.requestId,
    studentId:       d.studentId,
    student:         d.student,
    reason:          d.reason,
    reasonLabel:     d.reasonLabel,
    date:            d.date,
    startTime:       d.startTime,
    endTime:         d.endTime,
    description:     d.description,
    documentName:    d.documentName,
    status:          d.status,
    submittedAt:     d.submittedAt,
    facultyId:       d.facultyId,
    faculty:         d.faculty,
    reviewedAt:      d.reviewedAt,
    rejectionReason: d.rejectionReason,
  };
}

/**
 * GET /api/requests
 * - student : own requests only
 * - faculty / hod : all (optionally filtered by ?department=)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const filter: Record<string, unknown> = {};

    if (user.role === 'student') {
      filter['studentId'] = user.id;
    }

    const dept = req.query['department'] as string | undefined;
    if (dept) filter['student.department'] = dept;

    const docs = await RequestModel
      .find(filter)
      .sort({ submittedAt: -1 })
      .lean();

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
    const doc = await RequestModel.findOne({ requestId: req.params['id'] }).lean();
    if (!doc) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (req.user!.role === 'student' && doc.studentId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
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

  const { reason, date, startTime, endTime, description, documentName } = req.body as {
    reason: RequestReason;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
    documentName?: string;
  };

  if (!reason || !date || !startTime || !endTime || !description) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    // Load student profile from DB for the snapshot
    const studentUser = await UserModel.findOne({ userId: user.id }).lean();
    if (!studentUser) {
      res.status(400).json({ error: 'Student record not found' });
      return;
    }

    // Pick faculty from same department
    const facultyUser = await UserModel.findOne({
      role: 'faculty',
      department: studentUser.department,
    }).lean();

    // Generate requestId
    const count = await RequestModel.countDocuments();
    const requestId = `req-${String(count + 1).padStart(3, '0')}`;

    const studentSnap = {
      id:         studentUser.userId,
      name:       studentUser.name,
      rollNumber: studentUser.rollNumber!,
      department: studentUser.department,
      semester:   studentUser.semester!,
      email:      studentUser.email,
      ...(studentUser.avatarUrl && { avatarUrl: studentUser.avatarUrl }),
    };

    const facultySnap = facultyUser
      ? { id: facultyUser.userId, name: facultyUser.name, department: facultyUser.department, email: facultyUser.email }
      : undefined;

    const newDoc = await RequestModel.create({
      requestId,
      studentId:   user.id,
      student:     studentSnap,
      reason,
      reasonLabel: REASON_LABELS[reason] ?? reason,
      date,
      startTime,
      endTime,
      description,
      status:      'pending',
      submittedAt: new Date().toISOString(),
      ...(documentName && { documentName }),
      ...(facultyUser  && { facultyId: facultyUser.userId, faculty: facultySnap }),
    });

    res.status(201).json({ request: toApi(newDoc) });
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /api/requests/:id — faculty / HOD approves or rejects
 * Body: { action: 'approve' | 'reject', rejectionReason?: string }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'student') {
    res.status(403).json({ error: 'Students cannot review requests' });
    return;
  }

  const { action, rejectionReason } = req.body as {
    action: 'approve' | 'reject';
    rejectionReason?: string;
  };

  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({ error: 'action must be "approve" or "reject"' });
    return;
  }

  try {
    const existing = await RequestModel.findOne({ requestId: req.params['id'] });
    if (!existing) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (existing.status !== 'pending') {
      res.status(409).json({ error: 'Request has already been reviewed' });
      return;
    }

    existing.status     = action === 'approve' ? 'approved' : 'rejected';
    existing.reviewedAt = new Date().toISOString();
    if (action === 'reject' && rejectionReason) {
      existing.rejectionReason = rejectionReason;
    }

    await existing.save();
    res.json({ request: toApi(existing) });
  } catch (err) {
    console.error('PATCH /requests/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
