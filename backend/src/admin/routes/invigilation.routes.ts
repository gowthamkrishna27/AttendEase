/**
 * invigilation.routes.ts
 *
 * REST routes for Invigilation Management (Admin only):
 *
 * GET    /api/admin/invigilation       — list / filter duties
 * POST   /api/admin/invigilation       — create new duty with assignments
 * GET    /api/admin/invigilation/:id   — get single duty details
 * PUT    /api/admin/invigilation/:id   — update duty and assignments
 * DELETE /api/admin/invigilation/:id   — delete duty
 */
import { Router } from 'express';
import {
  getDuties,
  getDuty,
  createDuty,
  updateDuty,
  deleteDuty,
} from '../controllers/invigilation.controller.js';

const router = Router();

router.get('/',     getDuties);
router.post('/',    createDuty);
router.get('/:id',  getDuty);
router.put('/:id',  updateDuty);
router.delete('/:id', deleteDuty);

export default router;
