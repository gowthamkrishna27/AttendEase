/**
 * import.routes.ts
 *
 * POST /api/admin/students/import — bulk Excel/CSV import
 *
 * multer is configured here with:
 *   - memoryStorage (no temp files written to disk)
 *   - fileSize limit from admin config
 *
 * The single() call specifies the form field name ("file").
 */
import { Router } from 'express';
import multer from 'multer';
import { importConfig } from '../config/admin.config.js';
import { importStudents } from '../controllers/import.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: importConfig.maxFileSizeBytes },
});

const router = Router();

router.post('/', upload.single('file'), importStudents);

export default router;
