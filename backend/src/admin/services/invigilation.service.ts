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

export class InvalidDateTimeRangeError extends Error {
  constructor(message = 'endDateTime must be strictly after startDateTime.') {
    super(message);
    this.name = 'InvalidDateTimeRangeError';
  }
}

// ── Response Formatter Helper ─────────────────────────────────────────────────

interface DutyWithAssignments {
  id: string;
  examType: any;
  examName: string;
  subjectName: string;
  startDateTime: Date;
  endDateTime: Date;
  blockName: string;
  roomNumber: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{
    id: string;
    dutyType: string | null;
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
    id:            doc.id,
    examType:      doc.examType,
    examName:      doc.examName,
    subjectName:   doc.subjectName,
    startDateTime: doc.startDateTime.toISOString(),
    endDateTime:   doc.endDateTime.toISOString(),
    blockName:     doc.blockName,
    roomNumber:    doc.roomNumber,
    createdAt:     doc.createdAt.toISOString(),
    updatedAt:     doc.updatedAt.toISOString(),
    assignedFaculty: (doc.assignments || []).map((a) => ({
      assignmentId: a.id,
      facultyId:    a.faculty.id,
      userId:       a.faculty.userId,
      name:         a.faculty.name,
      email:        a.faculty.email,
      department:   a.faculty.department,
      designation:  a.faculty.designation,
      dutyType:     a.dutyType,
    })),
  };
}

// ── Faculty Resolution Helper ─────────────────────────────────────────────────

async function resolveAndValidateFaculty(
  assignedFaculty: Array<{ facultyId: string; dutyType?: string | null }>,
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
    return {
      user,
      dutyType: item.dutyType ?? null,
    };
  });

  // Verify unique resolved user IDs
  const resolvedIds = resolved.map((r) => r.user.id);
  if (new Set(resolvedIds).size !== resolvedIds.length) {
    throw new DuplicateFacultyAssignmentError();
  }

  return resolved;
}

// ── Service Functions ─────────────────────────────────────────────────────────

export async function createDuty(input: CreateDutyInput): Promise<InvigilationDutyResponse> {
  const start = new Date(input.startDateTime);
  const end   = new Date(input.endDateTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new InvalidDateTimeRangeError();
  }

  const resolvedFaculty = await resolveAndValidateFaculty(input.assignedFaculty);

  // Atomic creation via transaction
  const createdDuty = await prisma.$transaction(async (tx) => {
    return tx.invigilationDuty.create({
      data: {
        examType:      input.examType,
        examName:      input.examName,
        subjectName:   input.subjectName,
        startDateTime: start,
        endDateTime:   end,
        blockName:     input.blockName,
        roomNumber:    input.roomNumber,
        assignments: {
          create: resolvedFaculty.map((item) => ({
            facultyId: item.user.id,
            dutyType:  item.dutyType,
          })),
        },
      },
      include: {
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
      },
    });
  });

  return toDutyResponse(createdDuty as unknown as DutyWithAssignments);
}

export async function listDuties(filter: InvigilationFilterQuery): Promise<InvigilationDutyListResponse> {
  const whereConditions: Record<string, unknown> = {};

  if (filter.examType) {
    whereConditions['examType'] = filter.examType;
  }

  // Date filtering
  if (filter.date) {
    const startOfDay = new Date(`${filter.date}T00:00:00.000Z`);
    const endOfDay   = new Date(`${filter.date}T23:59:59.999Z`);
    whereConditions['startDateTime'] = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (filter.startDate || filter.endDate) {
    const dateRange: Record<string, Date> = {};
    if (filter.startDate) {
      dateRange['gte'] = new Date(filter.startDate);
    }
    if (filter.endDate) {
      dateRange['lte'] = new Date(filter.endDate);
    }
    whereConditions['startDateTime'] = dateRange;
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

  // Filter by department (derived through InvigilationAssignment -> User.department)
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
    include: {
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
    },
    orderBy: {
      startDateTime: 'asc',
    },
  });

  return {
    duties: duties.map((d) => toDutyResponse(d as unknown as DutyWithAssignments)),
    total: duties.length,
  };
}

export async function getDutyById(id: string): Promise<InvigilationDutyResponse> {
  const duty = await prisma.invigilationDuty.findUnique({
    where: { id },
    include: {
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
    },
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

  const start = input.startDateTime ? new Date(input.startDateTime) : existingDuty.startDateTime;
  const end   = input.endDateTime ? new Date(input.endDateTime) : existingDuty.endDateTime;

  if (end <= start) {
    throw new InvalidDateTimeRangeError();
  }

  let resolvedFaculty: Array<{ user: { id: string }; dutyType: string | null }> | null = null;
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
          dutyType: item.dutyType,
        })),
      });
    }

    return tx.invigilationDuty.update({
      where: { id },
      data: {
        ...(input.examType ? { examType: input.examType } : {}),
        ...(input.examName ? { examName: input.examName } : {}),
        ...(input.subjectName ? { subjectName: input.subjectName } : {}),
        ...(input.startDateTime ? { startDateTime: start } : {}),
        ...(input.endDateTime ? { endDateTime: end } : {}),
        ...(input.blockName ? { blockName: input.blockName } : {}),
        ...(input.roomNumber ? { roomNumber: input.roomNumber } : {}),
      },
      include: {
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
      },
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

  // Deleting InvigilationDuty will automatically cascade delete its InvigilationAssignment records,
  // while User (faculty) records remain completely untouched.
  await prisma.invigilationDuty.delete({
    where: { id },
  });

  return { success: true, message: 'Invigilation duty deleted successfully.' };
}
