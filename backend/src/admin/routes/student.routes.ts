/**
 * student.routes.ts
 *
 * GET    /api/admin/students           — list (paginated, searchable)
 * GET    /api/admin/students/:id       — single student
 * POST   /api/admin/students           — create
 * PUT    /api/admin/students/:id       — update
 * DELETE /api/admin/students/:id       — soft-delete
 *
 * Note: the /import route is registered on import.routes.ts and mounted before
 * /:id so that "import" is never interpreted as a userId param.
 */
import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller.js';

const router = Router();

router.get('/',     getStudents);
router.get('/:id',  getStudentById);
router.post('/',    createStudent);
router.put('/:id',  updateStudent);
router.delete('/:id', deleteStudent);

export default router;
