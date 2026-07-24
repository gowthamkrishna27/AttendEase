/**
 * user.routes.ts
 *
 * GET    /api/admin/users       — list all users
 * POST   /api/admin/users       — create user
 * PUT    /api/admin/users/:id   — update user
 * DELETE /api/admin/users/:id   — soft-delete user (guards against last admin)
 *
 * Password-specific endpoints are in password.routes.ts.
 */
import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';

const router = Router();

router.get('/',       getUsers);
router.post('/',      createUser);
router.put('/:id',    updateUser);
router.delete('/:id', deleteUser);

export default router;
