/**
 * announcement.types.ts
 *
 * Types and interfaces for Dynamic Announcements, Widgets, and Opening Animations.
 */

export type AnnouncementType = 'WIDGET' | 'OPENING_ANIMATION' | 'BANNER';
export type AnnouncementState = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type AnnouncementMediaType = 'IFRAME' | 'VIDEO' | 'IMAGE' | 'LOTTIE' | 'TEXT';
export type AnnouncementPlacement = 'HOME_TOP' | 'HOME_MIDDLE' | 'HOME_BOTTOM' | 'POPUP';
export type AnnouncementDisplayMode =
  | 'EVERY_PAGE_LOAD'
  | 'ONCE_PER_SESSION'
  | 'ONCE_PER_DAY'
  | 'ONCE_PER_LOGIN'
  | 'ONCE_PER_USER';

export type ComputedAnnouncementStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';

export interface CreateAnnouncementInput {
  title: string;
  type: AnnouncementType;
  mediaType: AnnouncementMediaType;
  state?: AnnouncementState;
  placement?: AnnouncementPlacement;

  srcUrl?: string | null;
  externalUrl?: string | null;
  content?: string | null;

  buttonText?: string | null;
  buttonUrl?: string | null;
  openInNewTab?: boolean;

  displayOrder?: number;
  priority?: number;

  targetRoles?: string[];
  targetYears?: string[];
  targetDepartments?: string[];
  targetSections?: string[];

  startsAt?: string | Date | null;
  endsAt?: string | Date | null;

  displayMode?: AnnouncementDisplayMode;

  closable?: boolean;
  showCloseButton?: boolean;
  autoCloseSeconds?: number | null;
  backdropDismiss?: boolean;

  height?: number | null;
  width?: number | null;
  mobileHeight?: number | null;
  desktopHeight?: number | null;
  aspectRatio?: string | null;
  fullWidth?: boolean;

  createdById?: string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  type?: AnnouncementType;
  mediaType?: AnnouncementMediaType;
  state?: AnnouncementState;
  placement?: AnnouncementPlacement;

  srcUrl?: string | null;
  externalUrl?: string | null;
  content?: string | null;

  buttonText?: string | null;
  buttonUrl?: string | null;
  openInNewTab?: boolean;

  displayOrder?: number;
  priority?: number;

  targetRoles?: string[];
  targetYears?: string[];
  targetDepartments?: string[];
  targetSections?: string[];

  startsAt?: string | Date | null;
  endsAt?: string | Date | null;

  displayMode?: AnnouncementDisplayMode;

  closable?: boolean;
  showCloseButton?: boolean;
  autoCloseSeconds?: number | null;
  backdropDismiss?: boolean;

  height?: number | null;
  width?: number | null;
  mobileHeight?: number | null;
  desktopHeight?: number | null;
  aspectRatio?: string | null;
  fullWidth?: boolean;

  updatedById?: string | null;
}

export interface AnnouncementAnalytics {
  viewsCount: number;
  dismissalsCount: number;
  clicksCount: number;
  ctr: number;
}

export interface AnnouncementAdminItem {
  id: string;
  title: string;
  type: AnnouncementType;
  mediaType: AnnouncementMediaType;
  state: AnnouncementState;
  computedStatus: ComputedAnnouncementStatus;
  placement: AnnouncementPlacement;

  srcUrl: string | null;
  externalUrl: string | null;
  content: string | null;

  buttonText: string | null;
  buttonUrl: string | null;
  openInNewTab: boolean;

  displayOrder: number;
  priority: number;

  targetRoles: string[];
  targetYears: string[];
  targetDepartments: string[];
  targetSections: string[];

  startsAt: string | null;
  endsAt: string | null;

  displayMode: AnnouncementDisplayMode;

  closable: boolean;
  showCloseButton: boolean;
  autoCloseSeconds: number | null;
  backdropDismiss: boolean;

  height: number | null;
  width: number | null;
  mobileHeight: number | null;
  desktopHeight: number | null;
  aspectRatio: string | null;
  fullWidth: boolean;

  createdById: string | null;
  updatedById: string | null;

  createdAt: string;
  updatedAt: string;

  analytics?: AnnouncementAnalytics;
}

export interface AnnouncementFilterQuery {
  type?: AnnouncementType;
  state?: AnnouncementState;
  placement?: AnnouncementPlacement;
  search?: string;
  role?: string;
  department?: string;
}
