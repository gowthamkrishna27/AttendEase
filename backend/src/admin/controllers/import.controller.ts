/**
 * import.controller.ts
 *
 * HTTP adapter for the bulk Excel/CSV import endpoint.
 *
 * File handling:
 *   - multer stores the file in memory (no orphaned temp files on disk)
 *   - File size and MIME type are validated before the service is called
 *   - The buffer is handed directly to import.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { importConfig } from '../config/admin.config.js';
import { isAllowedMimeType } from '../validators/import.validator.js';
import { importStudentsFromBuffer } from '../services/import.service.js';

export async function importStudents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Send a multipart/form-data request with field name "file".' });
      return;
    }

    if (!isAllowedMimeType(req.file.mimetype)) {
      res.status(415).json({
        error: `Unsupported file type: ${req.file.mimetype}. Accepted: .xlsx, .csv`,
      });
      return;
    }

    if (req.file.size > importConfig.maxFileSizeBytes) {
      res.status(413).json({
        error: `File too large. Maximum allowed size is ${importConfig.maxFileSizeBytes / (1024 * 1024)} MB.`,
      });
      return;
    }

    const report = await importStudentsFromBuffer(req.file.buffer);
    res.json({ import: report });
  } catch (err: any) {
    console.error('Error in importStudents controller:', err);
    res.status(500).json({ error: err.message || 'Failed to process student import' });
  }
}
