/**
 * announcement.validator.ts
 *
 * Zod validation schemas for Announcement & Widget Management.
 */
import { z } from 'zod';

const announcementTypeEnum = z.enum(['WIDGET', 'OPENING_ANIMATION', 'BANNER']);
const announcementStateEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);
const announcementMediaTypeEnum = z.enum(['IFRAME', 'VIDEO', 'IMAGE', 'LOTTIE', 'TEXT']);
const announcementPlacementEnum = z.enum(['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'POPUP']);
const announcementDisplayModeEnum = z.enum([
  'EVERY_PAGE_LOAD',
  'ONCE_PER_SESSION',
  'ONCE_PER_DAY',
  'ONCE_PER_LOGIN',
  'ONCE_PER_USER',
]);

const secureUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' || val.startsWith('/');
      } catch {
        return val.startsWith('/');
      }
    },
    { message: 'Must be a valid URL (HTTPS required for external links)' }
  )
  .nullable()
  .optional();

const optionalPositiveInt = z
  .number()
  .int('Must be an integer')
  .positive('Must be greater than 0')
  .nullable()
  .optional();

const optionalDateSchema = z
  .union([z.string().trim(), z.date()])
  .refine(
    (val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    { message: 'Must be a valid ISO date string' }
  )
  .transform((val) => (val ? new Date(val) : null))
  .nullable()
  .optional();

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    type: announcementTypeEnum,
    mediaType: announcementMediaTypeEnum,
    state: announcementStateEnum.default('DRAFT'),
    placement: announcementPlacementEnum.default('HOME_TOP'),

    srcUrl: secureUrlSchema,
    externalUrl: secureUrlSchema,
    content: z.string().trim().max(5000, 'Content cannot exceed 5000 characters').nullable().optional(),

    buttonText: z.string().trim().max(100).nullable().optional(),
    buttonUrl: secureUrlSchema,
    openInNewTab: z.boolean().default(true),

    displayOrder: z.number().int().min(0, 'displayOrder must be non-negative').default(0),
    priority: z.number().int().min(0, 'priority must be non-negative').default(0),

    targetRoles: z.array(z.string().trim()).default(['student']),
    targetYears: z.array(z.string().trim()).default([]),
    targetDepartments: z.array(z.string().trim()).default([]),
    targetSections: z.array(z.string().trim()).default([]),

    startsAt: optionalDateSchema,
    endsAt: optionalDateSchema,

    displayMode: announcementDisplayModeEnum.default('ONCE_PER_SESSION'),

    closable: z.boolean().default(true),
    showCloseButton: z.boolean().default(true),
    autoCloseSeconds: optionalPositiveInt,
    backdropDismiss: z.boolean().default(true),

    height: optionalPositiveInt,
    width: optionalPositiveInt,
    mobileHeight: optionalPositiveInt,
    desktopHeight: optionalPositiveInt,
    aspectRatio: z.string().trim().nullable().optional(),
    fullWidth: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt.getTime() > data.startsAt.getTime();
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endsAt'] }
  )
  .refine(
    (data) => {
      if (data.mediaType === 'IFRAME') {
        return !!data.srcUrl && data.srcUrl.trim().length > 0;
      }
      return true;
    },
    { message: 'Source URL is required for IFRAME media type', path: ['srcUrl'] }
  )
  .refine(
    (data) => {
      if (data.mediaType === 'VIDEO') {
        return !!data.srcUrl && data.srcUrl.trim().length > 0;
      }
      return true;
    },
    { message: 'Video URL is required for VIDEO media type', path: ['srcUrl'] }
  )
  .refine(
    (data) => {
      if (data.mediaType === 'IMAGE') {
        return !!data.srcUrl && data.srcUrl.trim().length > 0;
      }
      return true;
    },
    { message: 'Image URL is required for IMAGE media type', path: ['srcUrl'] }
  )
  .refine(
    (data) => {
      if (data.mediaType === 'TEXT') {
        return !!data.content && data.content.trim().length > 0;
      }
      return true;
    },
    { message: 'Content is required for TEXT media type', path: ['content'] }
  );

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
    type: announcementTypeEnum.optional(),
    mediaType: announcementMediaTypeEnum.optional(),
    state: announcementStateEnum.optional(),
    placement: announcementPlacementEnum.optional(),

    srcUrl: secureUrlSchema,
    externalUrl: secureUrlSchema,
    content: z.string().trim().max(5000).nullable().optional(),

    buttonText: z.string().trim().max(100).nullable().optional(),
    buttonUrl: secureUrlSchema,
    openInNewTab: z.boolean().optional(),

    displayOrder: z.number().int().min(0).optional(),
    priority: z.number().int().min(0).optional(),

    targetRoles: z.array(z.string().trim()).optional(),
    targetYears: z.array(z.string().trim()).optional(),
    targetDepartments: z.array(z.string().trim()).optional(),
    targetSections: z.array(z.string().trim()).optional(),

    startsAt: optionalDateSchema,
    endsAt: optionalDateSchema,

    displayMode: announcementDisplayModeEnum.optional(),

    closable: z.boolean().optional(),
    showCloseButton: z.boolean().optional(),
    autoCloseSeconds: optionalPositiveInt,
    backdropDismiss: z.boolean().optional(),

    height: optionalPositiveInt,
    width: optionalPositiveInt,
    mobileHeight: optionalPositiveInt,
    desktopHeight: optionalPositiveInt,
    aspectRatio: z.string().trim().nullable().optional(),
    fullWidth: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt.getTime() > data.startsAt.getTime();
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endsAt'] }
  );

export const toggleStateSchema = z.object({
  state: announcementStateEnum,
});

export const filterAnnouncementsQuerySchema = z.object({
  type: announcementTypeEnum.optional(),
  state: announcementStateEnum.optional(),
  placement: announcementPlacementEnum.optional(),
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  department: z.string().trim().optional(),
});
