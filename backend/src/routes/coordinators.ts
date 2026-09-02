import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  hashCoordinatorCode,
  generateUniqueCoordinatorCode,
  maskCoordinatorCode
} from '../utils/coordinatorUtils.js';
import type { ActivityCategory } from '@prisma/client';

const router = Router();

// Require JWT and Admin role on all coordinator management endpoints
router.use(verifyToken);
router.use(requireAdmin);

/**
 * GET /api/admin/coordinators
 * List all faculty coordinator access assignments.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const coordinators = await prisma.coordinatorAccess.findMany({
      include: {
        faculty: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          }
        },
        assignedBy: {
          select: {
            userId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: coordinators.length, coordinators });
  } catch (error) {
    console.error('GET /api/admin/coordinators error:', error);
    res.status(500).json({ error: 'Failed to fetch coordinator assignments' });
  }
});

/**
 * POST /api/admin/coordinators
 * Assign a faculty member as Coordinator for a specific activity category.
 * Generates a unique authorization code and returns it ONCE to Admin.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { facultyId, category, customCode } = req.body;

    if (!facultyId || !category) {
      res.status(400).json({ error: 'facultyId and category are required.' });
      return;
    }

    // Verify faculty exists
    const facultyUser = await prisma.user.findFirst({
      where: {
        OR: [{ userId: facultyId }, { id: facultyId }],
        role: { in: ['faculty', 'hod', 'admin'] }
      }
    });

    if (!facultyUser) {
      res.status(404).json({ error: `Faculty member '${facultyId}' not found.` });
      return;
    }

    // Check if assignment already exists
    const existing = await prisma.coordinatorAccess.findUnique({
      where: {
        facultyId_category: {
          facultyId: facultyUser.userId,
          category: category as ActivityCategory
        }
      }
    });

    if (existing) {
      res.status(409).json({ error: `${facultyUser.name} is already assigned as Coordinator for ${category}. Use code regeneration if needed.` });
      return;
    }

    // Use custom code if provided, otherwise generate 4-letter 4-digit combo (e.g. SOMA1234)
    const rawCode = (typeof customCode === 'string' && customCode.trim().length > 0)
      ? customCode.trim()
      : generateUniqueCoordinatorCode(facultyUser.name);
    const hashed = hashCoordinatorCode(rawCode);
    const masked = maskCoordinatorCode(rawCode);

    const adminUserId = (req.user as any)?.userId || req.user?.id;
    const adminUser = await prisma.user.findFirst({
      where: { OR: [{ userId: adminUserId }, { id: adminUserId }] }
    });
    const validAdminUserId = adminUser?.userId || facultyUser.userId;

    const coordinatorAccess = await prisma.coordinatorAccess.create({
      data: {
        facultyId: facultyUser.userId,
        category: category as ActivityCategory,
        codeHash: hashed,
        codeMasked: masked,
        isActive: true,
        assignedById: validAdminUserId,
      },
      include: {
        faculty: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
          }
        }
      }
    });

    // Write to Audit Log
    await prisma.activityAuditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'COORDINATOR_ASSIGNED',
        category: category,
        details: JSON.stringify({
          facultyId: facultyUser.userId,
          facultyName: facultyUser.name,
          category,
          maskedCode: masked
        })
      }
    });

    // Return generated code ONCE to Admin
    res.status(201).json({
      success: true,
      message: `Successfully assigned ${facultyUser.name} as ${category} Coordinator.`,
      generatedCode: rawCode,
      coordinator: coordinatorAccess
    });
  } catch (error) {
    console.error('POST /api/admin/coordinators error:', error);
    res.status(500).json({ error: 'Failed to assign coordinator access' });
  }
});

/**
 * POST /api/admin/coordinators/:id/regenerate
 * Regenerates the authorization code for a coordinator assignment.
 * Invalidates the previous code immediately.
 */
router.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customCode } = req.body;

    const existing = await prisma.coordinatorAccess.findUnique({
      where: { id },
      include: { faculty: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Coordinator assignment record not found.' });
      return;
    }

    // Use custom code if provided, otherwise generate 4-letter 4-digit combo (e.g. SOMA1234)
    const newRawCode = (typeof customCode === 'string' && customCode.trim().length > 0)
      ? customCode.trim()
      : generateUniqueCoordinatorCode(existing.faculty.name);
    const hashed = hashCoordinatorCode(newRawCode);
    const masked = maskCoordinatorCode(newRawCode);

    const updated = await prisma.coordinatorAccess.update({
      where: { id },
      data: {
        codeHash: hashed,
        codeMasked: masked,
        isActive: true,
        updatedAt: new Date()
      },
      include: { faculty: true }
    });

    // Audit log
    await prisma.activityAuditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'CODE_REGENERATED',
        category: existing.category,
        details: JSON.stringify({
          facultyId: existing.facultyId,
          facultyName: existing.faculty.name,
          category: existing.category,
          newMaskedCode: masked
        })
      }
    });

    res.json({
      success: true,
      message: `Regenerated authorization code for ${existing.faculty.name} (${existing.category}). Previous code is now invalid.`,
      generatedCode: newRawCode,
      coordinator: updated
    });
  } catch (error) {
    console.error('POST /api/admin/coordinators/:id/regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate coordinator code' });
  }
});

/**
 * PATCH /api/admin/coordinators/:id/toggle
 * Toggle active status of a coordinator assignment.
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive boolean flag is required.' });
      return;
    }

    const existing = await prisma.coordinatorAccess.findUnique({
      where: { id },
      include: { faculty: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Coordinator assignment record not found.' });
      return;
    }

    const updated = await prisma.coordinatorAccess.update({
      where: { id },
      data: { isActive },
      include: { faculty: true }
    });

    // Audit log
    await prisma.activityAuditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'ACCESS_TOGGLED',
        category: existing.category,
        details: JSON.stringify({
          facultyId: existing.facultyId,
          facultyName: existing.faculty.name,
          category: existing.category,
          isActive
        })
      }
    });

    res.json({
      success: true,
      message: `Coordinator status for ${existing.faculty.name} updated to ${isActive ? 'Active' : 'Disabled'}.`,
      coordinator: updated
    });
  } catch (error) {
    console.error('PATCH /api/admin/coordinators/:id/toggle error:', error);
    res.status(500).json({ error: 'Failed to update coordinator status' });
  }
});

/**
 * DELETE /api/admin/coordinators/:id
 * Revoke coordinator assignment record.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.coordinatorAccess.findUnique({
      where: { id },
      include: { faculty: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Coordinator assignment record not found.' });
      return;
    }

    await prisma.coordinatorAccess.delete({ where: { id } });

    // Audit log
    await prisma.activityAuditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'COORDINATOR_REVOKED',
        category: existing.category,
        details: JSON.stringify({
          facultyId: existing.facultyId,
          facultyName: existing.faculty.name,
          category: existing.category
        })
      }
    });

    res.json({
      success: true,
      message: `Revoked ${existing.category} coordinator assignment for ${existing.faculty.name}.`
    });
  } catch (error) {
    console.error('DELETE /api/admin/coordinators/:id error:', error);
    res.status(500).json({ error: 'Failed to revoke coordinator assignment' });
  }
});

export default router;
