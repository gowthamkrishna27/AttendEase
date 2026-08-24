import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const router = Router();

const REQUEST_INCLUDE = {
  student:        true,
  primaryFaculty: true,
  faculties:      { include: { faculty: true } },
} as const;

/**
 * GET /api/share/:publicId
 * Validates public share ID and user permissions, returning the target redirect path.
 */
router.get('/:publicId', verifyToken, async (req: Request, res: Response) => {
  const publicIdParam = (req.params['publicId'] || '').trim();
  const user = req.user;

  if (!user) {
    res.status(401).json({ success: false, status: 401, error: 'Authentication required' });
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

    const timestamp = new Date().toISOString();

    if (!doc) {
      console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicIdParam} | UserID: ${user.id} | Role: ${user.role} | Result: 404 NOT_FOUND`);
      res.status(404).json({ success: false, status: 404, error: 'Request not found' });
      return;
    }

    const publicId = doc.publicId || doc.requestId;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userId = (user.id || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();

    // 1. Student validation
    if (user.role === 'student') {
      const userRoll = (user.rollNumber || '').toLowerCase().trim();
      const stuUserId = (doc.studentId || doc.student?.userId || '').toLowerCase().trim();
      const stuRoll = (doc.student?.rollNumber || '').toLowerCase().trim();
      const stuEmail = (doc.student?.email || '').toLowerCase().trim();

      const isStudentOwner =
        stuUserId === userId ||
        (userRoll && stuRoll === userRoll) ||
        (userEmail && stuEmail === userEmail);

      if (isStudentOwner) {
        console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: student | Result: AUTHORIZED -> /student/request/${publicId}`);
        res.json({ success: true, redirectTo: `/student/request/${publicId}` });
        return;
      }

      console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: student | Result: DENIED 403 (Not Owner)`);
      res.status(403).json({ success: false, status: 403, error: 'Forbidden' });
      return;
    }

    // 2. Assigned Faculty validation
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

      if (isAssignedFaculty) {
        console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: faculty | Result: AUTHORIZED -> /faculty/review/${publicId}`);
        res.json({ success: true, redirectTo: `/faculty/review/${publicId}` });
        return;
      }

      console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: faculty | Result: DENIED 403 (Unassigned Faculty)`);
      res.status(403).json({ success: false, status: 403, error: 'Forbidden' });
      return;
    }

    // 3. HOD validation
    if (user.role === 'hod') {
      console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: hod | Result: AUTHORIZED -> /hod/review/${publicId}`);
      res.json({ success: true, redirectTo: `/hod/review/${publicId}` });
      return;
    }

    // 4. Admin restriction (Admins MUST NOT access shared links)
    if (user.role === 'admin') {
      console.log(`[SHARE LOG] ${timestamp} | PublicID: ${publicId} | UserID: ${user.id} | Role: admin | Result: DENIED 403 (Admin Restriction)`);
      res.status(403).json({ success: false, status: 403, error: 'Forbidden' });
      return;
    }

    // Default fallback
    res.status(403).json({ success: false, status: 403, error: 'Forbidden' });
  } catch (err) {
    console.error('GET /api/share/:publicId error:', err);
    res.status(500).json({ success: false, status: 500, error: 'Server error' });
  }
});

export default router;
