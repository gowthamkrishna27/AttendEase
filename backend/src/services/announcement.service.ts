/**
 * announcement.service.ts
 *
 * Centralized business logic for Dynamic Announcements, Widgets, and Opening Animations.
 */
import { prisma } from '../db/prisma.js';
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementFilterQuery,
  AnnouncementAdminItem,
  ComputedAnnouncementStatus,
  AnnouncementAnalytics,
} from '../admin/types/announcement.types.js';

export class AnnouncementNotFoundError extends Error {
  constructor(id: string) {
    super(`Announcement with id "${id}" not found.`);
    this.name = 'AnnouncementNotFoundError';
  }
}

/**
 * Calculates computed status based on state and scheduling dates.
 */
export function computeAnnouncementStatus(
  item: {
    state: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date = new Date()
): ComputedAnnouncementStatus {
  if (item.state === 'DRAFT') return 'DRAFT';
  if (item.state === 'INACTIVE') return 'INACTIVE';

  if (item.startsAt && now < item.startsAt) {
    return 'SCHEDULED';
  }
  if (item.endsAt && now > item.endsAt) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * Evaluates whether an announcement matches the user's attributes (Targeting).
 */
export function matchesTargeting(
  announcement: {
    targetRoles: string[];
    targetYears: string[];
    targetDepartments: string[];
    targetSections: string[];
  },
  user: {
    role?: string | null;
    department?: string | null;
    year?: string | null;
    section?: string | null;
    semester?: number | null;
  }
): boolean {
  // 1. Target Roles
  if (announcement.targetRoles && announcement.targetRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const roleMatched = announcement.targetRoles.some(
      (r) => r.toLowerCase() === userRole || r === '*'
    );
    if (!roleMatched) return false;
  }

  // 2. Target Departments
  if (announcement.targetDepartments && announcement.targetDepartments.length > 0) {
    const userDept = (user.department || '').trim().toLowerCase();
    const deptMatched = announcement.targetDepartments.some((d) => {
      const targetDept = d.trim().toLowerCase();
      return (
        targetDept === '*' ||
        userDept === targetDept ||
        userDept.includes(targetDept) ||
        targetDept.includes(userDept)
      );
    });
    if (!deptMatched) return false;
  }

  // 3. Target Years
  if (announcement.targetYears && announcement.targetYears.length > 0) {
    const userYear = (user.year || '').trim().toLowerCase();
    const sem = user.semester ? Math.ceil(user.semester / 2) : null;
    const derivedYearString = sem ? `${sem}` : '';
    const derivedYearLabel = sem ? `${sem}th year` : '';

    const yearMatched = announcement.targetYears.some((y) => {
      const targetYear = y.trim().toLowerCase();
      if (targetYear === '*') return true;
      if (userYear && (userYear === targetYear || userYear.includes(targetYear) || targetYear.includes(userYear))) {
        return true;
      }
      if (derivedYearString && (targetYear === derivedYearString || targetYear.includes(derivedYearString))) {
        return true;
      }
      if (derivedYearLabel && (targetYear === derivedYearLabel || targetYear.includes(derivedYearLabel))) {
        return true;
      }
      return false;
    });
    if (!yearMatched) return false;
  }

  // 4. Target Sections
  if (announcement.targetSections && announcement.targetSections.length > 0) {
    const userSec = (user.section || '').trim().toLowerCase();
    const secMatched = announcement.targetSections.some((s) => {
      const targetSec = s.trim().toLowerCase();
      return (
        targetSec === '*' ||
        userSec === targetSec ||
        userSec.includes(targetSec) ||
        targetSec.includes(userSec)
      );
    });
    if (!secMatched) return false;
  }

  return true;
}

/**
 * Student / Client facing API: Returns all eligible active announcements for a user.
 */
export async function getEligibleAnnouncements(user: {
  userId: string;
  role: string;
  department: string;
  year?: string | null;
  section?: string | null;
  semester?: number | null;
}) {
  const now = new Date();

  // Query all ACTIVE announcements
  const activeAnnouncements = await prisma.announcementWidget.findMany({
    where: {
      state: 'ACTIVE',
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { displayOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  if (activeAnnouncements.length === 0) {
    return [];
  }

  // Fetch user views/dismissals for ONCE_PER_USER frequency handling
  const userViews = await prisma.announcementView.findMany({
    where: {
      userId: user.userId,
      announcementId: { in: activeAnnouncements.map((a) => a.id) },
    },
  });

  const viewsMap = new Map(userViews.map((v) => [v.announcementId, v]));

  // Filter in-memory by targeting and display mode
  const eligible = activeAnnouncements.filter((announcement) => {
    // Check targeting
    if (!matchesTargeting(announcement, user)) {
      return false;
    }

    // Check ONCE_PER_USER dismissal
    if (announcement.displayMode === 'ONCE_PER_USER') {
      const userView = viewsMap.get(announcement.id);
      if (userView && userView.dismissedAt) {
        return false;
      }
    }

    return true;
  });

  return eligible.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    mediaType: item.mediaType,
    placement: item.placement,
    srcUrl: item.srcUrl,
    externalUrl: item.externalUrl,
    content: item.content,
    buttonText: item.buttonText,
    buttonUrl: item.buttonUrl,
    openInNewTab: item.openInNewTab,
    displayOrder: item.displayOrder,
    priority: item.priority,
    displayMode: item.displayMode,
    closable: item.closable,
    showCloseButton: item.showCloseButton,
    autoCloseSeconds: item.autoCloseSeconds,
    backdropDismiss: item.backdropDismiss,
    height: item.height,
    width: item.width,
    mobileHeight: item.mobileHeight,
    desktopHeight: item.desktopHeight,
    aspectRatio: item.aspectRatio,
    fullWidth: item.fullWidth,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

/**
 * Records a view / impression for an announcement.
 */
export async function recordAnnouncementView(announcementId: string, userId: string) {
  return prisma.announcementView.upsert({
    where: {
      announcementId_userId: { announcementId, userId },
    },
    update: {
      viewedAt: new Date(),
    },
    create: {
      announcementId,
      userId,
      viewedAt: new Date(),
    },
  });
}

/**
 * Records a dismissal for an announcement.
 */
export async function recordAnnouncementDismissal(announcementId: string, userId: string) {
  return prisma.announcementView.upsert({
    where: {
      announcementId_userId: { announcementId, userId },
    },
    update: {
      dismissedAt: new Date(),
    },
    create: {
      announcementId,
      userId,
      dismissedAt: new Date(),
    },
  });
}

/**
 * Records a CTA click for an announcement.
 */
export async function recordAnnouncementClick(announcementId: string, userId: string) {
  return prisma.announcementView.upsert({
    where: {
      announcementId_userId: { announcementId, userId },
    },
    update: {
      clickedAt: new Date(),
    },
    create: {
      announcementId,
      userId,
      clickedAt: new Date(),
    },
  });
}

// ── Admin Service Operations ──────────────────────────────────────────────────

/**
 * Lists all announcements with optional filters and computes live statuses & analytics.
 */
export async function listAdminAnnouncements(
  filter: AnnouncementFilterQuery = {}
): Promise<{ announcements: AnnouncementAdminItem[]; total: number }> {
  const where: any = {};

  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.state) {
    where.state = filter.state;
  }
  if (filter.placement) {
    where.placement = filter.placement;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { content: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.announcementWidget.findMany({
    where,
    include: {
      views: {
        select: {
          id: true,
          viewedAt: true,
          dismissedAt: true,
          clickedAt: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { displayOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const now = new Date();

  const formatted: AnnouncementAdminItem[] = items.map((item) => {
    const computedStatus = computeAnnouncementStatus(item, now);

    const viewsCount = item.views.length;
    const dismissalsCount = item.views.filter((v) => v.dismissedAt !== null).length;
    const clicksCount = item.views.filter((v) => v.clickedAt !== null).length;
    const ctr = viewsCount > 0 ? parseFloat(((clicksCount / viewsCount) * 100).toFixed(1)) : 0;

    const analytics: AnnouncementAnalytics = {
      viewsCount,
      dismissalsCount,
      clicksCount,
      ctr,
    };

    return {
      id: item.id,
      title: item.title,
      type: item.type,
      mediaType: item.mediaType,
      state: item.state,
      computedStatus,
      placement: item.placement,
      srcUrl: item.srcUrl,
      externalUrl: item.externalUrl,
      content: item.content,
      buttonText: item.buttonText,
      buttonUrl: item.buttonUrl,
      openInNewTab: item.openInNewTab,
      displayOrder: item.displayOrder,
      priority: item.priority,
      targetRoles: item.targetRoles,
      targetYears: item.targetYears,
      targetDepartments: item.targetDepartments,
      targetSections: item.targetSections,
      startsAt: item.startsAt ? item.startsAt.toISOString() : null,
      endsAt: item.endsAt ? item.endsAt.toISOString() : null,
      displayMode: item.displayMode,
      closable: item.closable,
      showCloseButton: item.showCloseButton,
      autoCloseSeconds: item.autoCloseSeconds,
      backdropDismiss: item.backdropDismiss,
      height: item.height,
      width: item.width,
      mobileHeight: item.mobileHeight,
      desktopHeight: item.desktopHeight,
      aspectRatio: item.aspectRatio,
      fullWidth: item.fullWidth,
      createdById: item.createdById,
      updatedById: item.updatedById,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      analytics,
    };
  });

  return { announcements: formatted, total: formatted.length };
}

/**
 * Retrieves a single announcement by ID.
 */
export async function getAnnouncementById(id: string): Promise<AnnouncementAdminItem> {
  const item = await prisma.announcementWidget.findUnique({
    where: { id },
    include: {
      views: {
        select: {
          id: true,
          viewedAt: true,
          dismissedAt: true,
          clickedAt: true,
        },
      },
    },
  });

  if (!item) {
    throw new AnnouncementNotFoundError(id);
  }

  const now = new Date();
  const computedStatus = computeAnnouncementStatus(item, now);

  const viewsCount = item.views.length;
  const dismissalsCount = item.views.filter((v) => v.dismissedAt !== null).length;
  const clicksCount = item.views.filter((v) => v.clickedAt !== null).length;
  const ctr = viewsCount > 0 ? parseFloat(((clicksCount / viewsCount) * 100).toFixed(1)) : 0;

  return {
    id: item.id,
    title: item.title,
    type: item.type,
    mediaType: item.mediaType,
    state: item.state,
    computedStatus,
    placement: item.placement,
    srcUrl: item.srcUrl,
    externalUrl: item.externalUrl,
    content: item.content,
    buttonText: item.buttonText,
    buttonUrl: item.buttonUrl,
    openInNewTab: item.openInNewTab,
    displayOrder: item.displayOrder,
    priority: item.priority,
    targetRoles: item.targetRoles,
    targetYears: item.targetYears,
    targetDepartments: item.targetDepartments,
    targetSections: item.targetSections,
    startsAt: item.startsAt ? item.startsAt.toISOString() : null,
    endsAt: item.endsAt ? item.endsAt.toISOString() : null,
    displayMode: item.displayMode,
    closable: item.closable,
    showCloseButton: item.showCloseButton,
    autoCloseSeconds: item.autoCloseSeconds,
    backdropDismiss: item.backdropDismiss,
    height: item.height,
    width: item.width,
    mobileHeight: item.mobileHeight,
    desktopHeight: item.desktopHeight,
    aspectRatio: item.aspectRatio,
    fullWidth: item.fullWidth,
    createdById: item.createdById,
    updatedById: item.updatedById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    analytics: { viewsCount, dismissalsCount, clicksCount, ctr },
  };
}

/**
 * Creates a new announcement.
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<AnnouncementAdminItem> {
  const created = await prisma.announcementWidget.create({
    data: {
      title: input.title,
      type: input.type,
      mediaType: input.mediaType,
      state: input.state ?? 'DRAFT',
      placement: input.placement ?? 'HOME_TOP',
      srcUrl: input.srcUrl ?? null,
      externalUrl: input.externalUrl ?? null,
      content: input.content ?? null,
      buttonText: input.buttonText ?? null,
      buttonUrl: input.buttonUrl ?? null,
      openInNewTab: input.openInNewTab ?? true,
      displayOrder: input.displayOrder ?? 0,
      priority: input.priority ?? 0,
      targetRoles: input.targetRoles ?? ['student'],
      targetYears: input.targetYears ?? [],
      targetDepartments: input.targetDepartments ?? [],
      targetSections: input.targetSections ?? [],
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      displayMode: input.displayMode ?? 'ONCE_PER_SESSION',
      closable: input.closable ?? true,
      showCloseButton: input.showCloseButton ?? true,
      autoCloseSeconds: input.autoCloseSeconds ?? null,
      backdropDismiss: input.backdropDismiss ?? true,
      height: input.height ?? null,
      width: input.width ?? null,
      mobileHeight: input.mobileHeight ?? null,
      desktopHeight: input.desktopHeight ?? null,
      aspectRatio: input.aspectRatio ?? null,
      fullWidth: input.fullWidth ?? false,
      createdById: input.createdById ?? null,
    },
  });

  return getAnnouncementById(created.id);
}

/**
 * Updates an existing announcement.
 */
export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<AnnouncementAdminItem> {
  const exists = await prisma.announcementWidget.findUnique({ where: { id } });
  if (!exists) {
    throw new AnnouncementNotFoundError(id);
  }

  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.type !== undefined) data.type = input.type;
  if (input.mediaType !== undefined) data.mediaType = input.mediaType;
  if (input.state !== undefined) data.state = input.state;
  if (input.placement !== undefined) data.placement = input.placement;
  if (input.srcUrl !== undefined) data.srcUrl = input.srcUrl;
  if (input.externalUrl !== undefined) data.externalUrl = input.externalUrl;
  if (input.content !== undefined) data.content = input.content;
  if (input.buttonText !== undefined) data.buttonText = input.buttonText;
  if (input.buttonUrl !== undefined) data.buttonUrl = input.buttonUrl;
  if (input.openInNewTab !== undefined) data.openInNewTab = input.openInNewTab;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.targetRoles !== undefined) data.targetRoles = input.targetRoles;
  if (input.targetYears !== undefined) data.targetYears = input.targetYears;
  if (input.targetDepartments !== undefined) data.targetDepartments = input.targetDepartments;
  if (input.targetSections !== undefined) data.targetSections = input.targetSections;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (input.displayMode !== undefined) data.displayMode = input.displayMode;
  if (input.closable !== undefined) data.closable = input.closable;
  if (input.showCloseButton !== undefined) data.showCloseButton = input.showCloseButton;
  if (input.autoCloseSeconds !== undefined) data.autoCloseSeconds = input.autoCloseSeconds;
  if (input.backdropDismiss !== undefined) data.backdropDismiss = input.backdropDismiss;
  if (input.height !== undefined) data.height = input.height;
  if (input.width !== undefined) data.width = input.width;
  if (input.mobileHeight !== undefined) data.mobileHeight = input.mobileHeight;
  if (input.desktopHeight !== undefined) data.desktopHeight = input.desktopHeight;
  if (input.aspectRatio !== undefined) data.aspectRatio = input.aspectRatio;
  if (input.fullWidth !== undefined) data.fullWidth = input.fullWidth;
  if (input.updatedById !== undefined) data.updatedById = input.updatedById;

  await prisma.announcementWidget.update({
    where: { id },
    data,
  });

  return getAnnouncementById(id);
}

/**
 * Toggles an announcement's active/inactive/draft state.
 */
export async function toggleAnnouncementState(
  id: string,
  state: 'DRAFT' | 'ACTIVE' | 'INACTIVE',
  updatedById?: string
): Promise<AnnouncementAdminItem> {
  const exists = await prisma.announcementWidget.findUnique({ where: { id } });
  if (!exists) {
    throw new AnnouncementNotFoundError(id);
  }

  await prisma.announcementWidget.update({
    where: { id },
    data: {
      state,
      ...(updatedById && { updatedById }),
    },
  });

  return getAnnouncementById(id);
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<{ success: boolean; message: string }> {
  const exists = await prisma.announcementWidget.findUnique({ where: { id } });
  if (!exists) {
    throw new AnnouncementNotFoundError(id);
  }

  await prisma.announcementWidget.delete({ where: { id } });
  return { success: true, message: `Announcement "${exists.title}" deleted successfully.` };
}
