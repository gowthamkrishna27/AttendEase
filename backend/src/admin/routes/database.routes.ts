/**
 * database.routes.ts
 *
 * Provides database introspection & raw table viewer for Admin.
 * GET /api/admin/database/overview           — list all DB tables and row counts
 * GET /api/admin/database/tables/:tableName  — get paginated raw table data with search & sort
 * POST /api/admin/database/export/:tableName — export full table data
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

interface TableConfig {
  name: string;
  label: string;
  description: string;
  model: keyof typeof modelMap;
  searchFields: string[];
  defaultSortField: string;
}

const modelMap = {
  User: prisma.user,
  Request: prisma.request,
  RequestFaculty: prisma.requestFaculty,
  RequestAction: prisma.requestAction,
  Notification: prisma.notification,
  UserPasskey: prisma.userPasskey,
  AttendanceSubmission: prisma.attendanceSubmission,
  AttendanceRecord: prisma.attendanceRecord,
};

const TABLES: TableConfig[] = [
  {
    name: 'User',
    label: 'Users (Accounts & Profiles)',
    description: 'Students, Faculty, HODs, and Administrators accounts with roles & credentials',
    model: 'User',
    searchFields: ['userId', 'name', 'email', 'department', 'rollNumber', 'phone', 'designation'],
    defaultSortField: 'createdAt',
  },
  {
    name: 'Request',
    label: 'Requests (Permission Slips)',
    description: 'Attendance permission and on-duty requests submitted by students',
    model: 'Request',
    searchFields: ['requestId', 'publicId', 'studentId', 'reasonLabel', 'description', 'date', 'status'],
    defaultSortField: 'createdAt',
  },
  {
    name: 'RequestFaculty',
    label: 'Request Faculty (Assignments)',
    description: 'Join table linking assigned reviewers/faculty to student requests',
    model: 'RequestFaculty',
    searchFields: ['requestId', 'facultyId'],
    defaultSortField: 'requestId',
  },
  {
    name: 'RequestAction',
    label: 'Request Actions (Audit Trail)',
    description: 'Immutable historical audit logs for approvals, rejections, overrides, & notes',
    model: 'RequestAction',
    searchFields: ['requestId', 'performedById', 'action', 'remarks'],
    defaultSortField: 'performedAt',
  },
  {
    name: 'Notification',
    label: 'Notifications',
    description: 'In-app notification records sent to users for status updates and alerts',
    model: 'Notification',
    searchFields: ['userId', 'requestId', 'title', 'message', 'type'],
    defaultSortField: 'createdAt',
  },
  {
    name: 'UserPasskey',
    label: 'User Passkeys (Biometrics)',
    description: 'WebAuthn hardware/biometric security credentials (Touch ID, Windows Hello, Face ID)',
    model: 'UserPasskey',
    searchFields: ['userId', 'credentialId', 'deviceName'],
    defaultSortField: 'createdAt',
  },
  {
    name: 'AttendanceSubmission',
    label: 'Attendance Submissions',
    description: 'Faculty classroom period attendance marked for sections and dates',
    model: 'AttendanceSubmission',
    searchFields: ['date', 'section', 'year', 'periods', 'periodLabel', 'markedById'],
    defaultSortField: 'createdAt',
  },
  {
    name: 'AttendanceRecord',
    label: 'Attendance Records',
    description: 'Student-level present/absent status rows mapped to attendance submissions',
    model: 'AttendanceRecord',
    searchFields: ['submissionId', 'rollNumber', 'status'],
    defaultSortField: 'rollNumber',
  },
];

/**
 * GET /api/admin/database/overview
 * Returns list of tables, descriptions, and total row counts.
 */
router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  try {
    const overview = await Promise.all(
      TABLES.map(async (table) => {
        const delegate = (modelMap as any)[table.model];
        let count = 0;
        let sampleRow: any = null;
        try {
          count = await delegate.count();
          sampleRow = await delegate.findFirst();
        } catch (err) {
          console.error(`Count error for ${table.name}:`, err);
        }

        const columns = sampleRow ? Object.keys(sampleRow) : [];

        return {
          name: table.name,
          label: table.label,
          description: table.description,
          count,
          columns,
        };
      })
    );

    res.json({
      success: true,
      database: 'PostgreSQL (Prisma ORM)',
      totalTables: TABLES.length,
      tables: overview,
    });
  } catch (err: any) {
    console.error('GET /database/overview error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/admin/database/tables/:tableName
 * Returns paginated table data with column list, search filter, and sorting.
 */
router.get('/tables/:tableName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableName } = req.params;
    const tableConfig = TABLES.find(t => t.name.toLowerCase() === tableName.toLowerCase());

    if (!tableConfig) {
      res.status(404).json({ error: `Table "${tableName}" not found.` });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string || '50', 10)));
    const search = (req.query.search as string || '').trim();
    const sortBy = (req.query.sortBy as string || tableConfig.defaultSortField).trim();
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const delegate = (modelMap as any)[tableConfig.model];

    // Build where clause for search
    let where: any = {};
    if (search) {
      const orClauses = tableConfig.searchFields.map(field => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
      where = { OR: orClauses };
    }

    // Build orderBy clause
    let orderBy: any = {};
    if (sortBy) {
      orderBy = { [sortBy]: sortOrder };
    }

    const [totalRows, rows, sampleRow] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      delegate.findFirst(),
    ]);

    // Extract all column names from sample or rows
    const columnSet = new Set<string>();
    if (sampleRow) {
      Object.keys(sampleRow).forEach(k => columnSet.add(k));
    }
    rows.forEach((r: any) => {
      Object.keys(r).forEach(k => columnSet.add(k));
    });

    const columns = Array.from(columnSet);

    res.json({
      success: true,
      tableName: tableConfig.name,
      label: tableConfig.label,
      description: tableConfig.description,
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
      columns,
      rows,
    });
  } catch (err: any) {
    console.error('GET /database/tables/:tableName error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/admin/database/export/:tableName
 * Returns full rows for exporting as JSON.
 */
router.get('/export/:tableName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableName } = req.params;
    const tableConfig = TABLES.find(t => t.name.toLowerCase() === tableName.toLowerCase());

    if (!tableConfig) {
      res.status(404).json({ error: `Table "${tableName}" not found.` });
      return;
    }

    const delegate = (modelMap as any)[tableConfig.model];
    const rows = await delegate.findMany({
      take: 5000,
    });

    res.json({
      success: true,
      tableName: tableConfig.name,
      count: rows.length,
      exportedAt: new Date().toISOString(),
      data: rows,
    });
  } catch (err: any) {
    console.error('GET /database/export/:tableName error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
