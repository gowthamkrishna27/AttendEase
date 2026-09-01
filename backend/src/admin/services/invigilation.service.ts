/**
 * invigilation.service.ts
 *
 * Business logic and database operations for Invigilation Management.
 */
import { prisma } from '../../db/prisma.js';
import type {
  CreateDutyInput,
  UpdateDutyInput,
  InvigilationFilterQuery,
  InvigilationDutyResponse,
  InvigilationDutyListResponse,
} from '../types/invigilation.types.js';

// ── Custom Domain Errors ──────────────────────────────────────────────────────

export class DutyNotFoundError extends Error {
  constructor(id: string) {
    super(`Invigilation duty with id "${id}" not found.`);
    this.name = 'DutyNotFoundError';
  }
}

export class InvalidFacultyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFacultyError';
  }
}

export class DuplicateFacultyAssignmentError extends Error {
  constructor(message = 'Duplicate faculty assignments are not allowed for the same duty.') {
    super(message);
    this.name = 'DuplicateFacultyAssignmentError';
  }
}

// ── Response Formatter Helper ─────────────────────────────────────────────────

interface DutyWithAssignments {
  id: string;
  examType: any;
  date: string;
  session: any;
  startTime: string | null;
  endTime: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{
    id: string;
    facultyId: string;
    faculty: {
      id: string;
      userId: string;
      name: string;
      email: string;
      department: string;
      designation: string | null;
    };
  }>;
}

function toDutyResponse(doc: DutyWithAssignments): InvigilationDutyResponse {
  return {
    id:        doc.id,
    examType:  doc.examType,
    date:      doc.date,
    session:   doc.session,
    startTime: doc.startTime ?? null,
    endTime:   doc.endTime ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    assignedFaculty: (doc.assignments || []).map((a) => ({
      assignmentId: a.id,
      facultyId:    a.faculty.id,
      userId:       a.faculty.userId,
      name:         a.faculty.name,
      email:        a.faculty.email,
      department:   a.faculty.department,
      designation:  a.faculty.designation,
    })),
  };
}

// ── Faculty Resolution Helper ─────────────────────────────────────────────────

async function resolveAndValidateFaculty(
  assignedFaculty: Array<{ facultyId: string }>,
) {
  const requestedIds = assignedFaculty.map((f) => f.facultyId);

  // Check for duplicates in input
  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new DuplicateFacultyAssignmentError();
  }

  // Look up users by primary key (id) or human-readable (userId)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: { in: requestedIds } },
        { userId: { in: requestedIds } },
      ],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      role: true,
      department: true,
      designation: true,
    },
  });

  const resolved = assignedFaculty.map((item) => {
    const user = users.find((u) => u.id === item.facultyId || u.userId === item.facultyId);
    if (!user) {
      throw new InvalidFacultyError(`Faculty user "${item.facultyId}" does not exist.`);
    }
    if (user.role !== 'faculty') {
      throw new InvalidFacultyError(`User "${user.name}" (${user.userId}) is a ${user.role}, not faculty.`);
    }
    return { user };
  });

  // Verify unique resolved user IDs
  const resolvedIds = resolved.map((r) => r.user.id);
  if (new Set(resolvedIds).size !== resolvedIds.length) {
    throw new DuplicateFacultyAssignmentError();
  }

  return resolved;
}

const dutyInclude = {
  assignments: {
    include: {
      faculty: {
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          department: true,
          designation: true,
        },
      },
    },
  },
};

// ── Service Functions ─────────────────────────────────────────────────────────

export async function createDuty(input: CreateDutyInput): Promise<InvigilationDutyResponse> {
  const resolvedFaculty = await resolveAndValidateFaculty(input.assignedFaculty);

  // Atomic creation via transaction
  const createdDuty = await prisma.$transaction(async (tx) => {
    return tx.invigilationDuty.create({
      data: {
        examType:  input.examType,
        date:      input.date,
        session:   input.session,
        startTime: input.startTime ?? null,
        endTime:   input.endTime ?? null,
        assignments: {
          create: resolvedFaculty.map((item) => ({
            facultyId: item.user.id,
          })),
        },
      },
      include: dutyInclude,
    });
  });

  return toDutyResponse(createdDuty as unknown as DutyWithAssignments);
}

export async function listDuties(filter: InvigilationFilterQuery): Promise<InvigilationDutyListResponse> {
  const whereConditions: Record<string, unknown> = {};

  if (filter.examType) {
    whereConditions['examType'] = filter.examType;
  }

  if (filter.session) {
    whereConditions['session'] = filter.session;
  }

  // Date filtering — filter.date expects YYYY-MM-DD string
  if (filter.date) {
    whereConditions['date'] = filter.date;
  } else if (filter.startDate || filter.endDate) {
    // For range queries on string date field we use gte/lte on alphabetical comparison
    const dateRange: Record<string, string> = {};
    if (filter.startDate) {
      // filter.startDate may be ISO datetime — extract just the date part
      dateRange['gte'] = filter.startDate.substring(0, 10);
    }
    if (filter.endDate) {
      dateRange['lte'] = filter.endDate.substring(0, 10);
    }
    whereConditions['date'] = dateRange;
  }

  // Filter by faculty
  if (filter.facultyId) {
    whereConditions['assignments'] = {
      some: {
        OR: [
          { facultyId: filter.facultyId },
          { faculty: { userId: filter.facultyId } },
        ],
      },
    };
  }

  // Filter by department (through faculty)
  if (filter.department) {
    const existingAssignments = (whereConditions['assignments'] as Record<string, unknown>) || {};
    const existingSome = (existingAssignments['some'] as Record<string, unknown>) || {};

    whereConditions['assignments'] = {
      ...existingAssignments,
      some: {
        ...existingSome,
        faculty: {
          department: {
            equals: filter.department,
            mode: 'insensitive',
          },
        },
      },
    };
  }

  const duties = await prisma.invigilationDuty.findMany({
    where: whereConditions,
    include: dutyInclude,
    orderBy: [{ date: 'asc' }, { session: 'asc' }],
  });

  return {
    duties: duties.map((d) => toDutyResponse(d as unknown as DutyWithAssignments)),
    total: duties.length,
  };
}

export async function getDutyById(id: string): Promise<InvigilationDutyResponse> {
  const duty = await prisma.invigilationDuty.findUnique({
    where: { id },
    include: dutyInclude,
  });

  if (!duty) {
    throw new DutyNotFoundError(id);
  }

  return toDutyResponse(duty as unknown as DutyWithAssignments);
}

export async function updateDuty(id: string, input: UpdateDutyInput): Promise<InvigilationDutyResponse> {
  const existingDuty = await prisma.invigilationDuty.findUnique({
    where: { id },
    include: { assignments: true },
  });

  if (!existingDuty) {
    throw new DutyNotFoundError(id);
  }

  let resolvedFaculty: Array<{ user: { id: string } }> | null = null;
  if (input.assignedFaculty) {
    resolvedFaculty = await resolveAndValidateFaculty(input.assignedFaculty);
  }

  const updatedDuty = await prisma.$transaction(async (tx) => {
    // If faculty assignments are updated, synchronize them
    if (resolvedFaculty) {
      await tx.invigilationAssignment.deleteMany({
        where: { dutyId: id },
      });

      await tx.invigilationAssignment.createMany({
        data: resolvedFaculty.map((item) => ({
          dutyId: id,
          facultyId: item.user.id,
        })),
      });
    }

    return tx.invigilationDuty.update({
      where: { id },
      data: {
        ...(input.examType !== undefined ? { examType: input.examType } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.session !== undefined ? { session: input.session } : {}),
        ...('startTime' in input ? { startTime: input.startTime ?? null } : {}),
        ...('endTime' in input ? { endTime: input.endTime ?? null } : {}),
      },
      include: dutyInclude,
    });
  });

  return toDutyResponse(updatedDuty as unknown as DutyWithAssignments);
}

export async function deleteDuty(id: string): Promise<{ success: boolean; message: string }> {
  const existing = await prisma.invigilationDuty.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new DutyNotFoundError(id);
  }

  // Cascade delete handles InvigilationAssignment records automatically
  await prisma.invigilationDuty.delete({
    where: { id },
  });

  return { success: true, message: 'Invigilation duty deleted successfully.' };
}
