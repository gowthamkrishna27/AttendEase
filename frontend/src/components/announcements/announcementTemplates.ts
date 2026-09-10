/**
 * announcementTemplates.ts
 *
 * Built-in animation styles, presets, templates, and payload utilities
 * for dynamic text announcements and widgets.
 */

export type TextAnimationType =
  | 'NONE'
  | 'TYPEWRITER'
  | 'NEON_SHIMMER'
  | 'MARQUEE_TICKER'
  | 'BOUNCE_WAVE'
  | 'CYBER_GLITCH'
  | 'SPARKLE_PULSE'
  | 'CINEMATIC_BLUR'
  | 'FLIP_3D'
  | 'GRADIENT_FLOW'
  | 'BREAKING_FLASH';

export type TemplatePresetId =
  | 'CUSTOM'
  | 'EXAM_ALERT'
  | 'SPORTS_FEST'
  | 'CELEBRATION'
  | 'CAMPUS_NOTICE'
  | 'PLACEMENT_DRIVE'
  | 'TIP_NOTICE';

export type GradientThemeId =
  | 'indigo_purple'
  | 'amber_rose'
  | 'emerald_cyan'
  | 'cyber_neon'
  | 'sunset_flame'
  | 'royal_gold'
  | 'dark_slate';

export interface AnimatedAnnouncementPayload {
  isAnimated: true;
  text: string;
  animation: TextAnimationType;
  template?: TemplatePresetId;
  badge?: string;
  gradientTheme?: GradientThemeId;
  speed?: 'slow' | 'normal' | 'fast';
  highlightWords?: string[];
}

export interface TextAnimationOption {
  id: TextAnimationType;
  label: string;
  description: string;
  icon: string;
  previewText: string;
  category: 'Modern' | 'Urgent' | 'Dynamic' | 'Subtle';
}

export const TEXT_ANIMATION_OPTIONS: TextAnimationOption[] = [
  {
    id: 'TYPEWRITER',
    label: 'Typewriter Effect',
    description: 'Letter-by-letter live terminal typing with pulsing cursor',
    icon: '⌨️',
    previewText: 'Live announcement typing in real time...',
    category: 'Dynamic',
  },
  {
    id: 'NEON_SHIMMER',
    label: 'Neon Glow Shimmer',
    description: 'Radiant animated light sweep and soft electric glow',
    icon: '✨',
    previewText: '✨ Radiant shimmering neon text beam ✨',
    category: 'Modern',
  },
  {
    id: 'MARQUEE_TICKER',
    label: 'Continuous Ticker',
    description: 'Smooth uninterrupted horizontal news headline scroll',
    icon: '📜',
    previewText: '🔴 BREAKING NEWS • Important campus announcement and updates •',
    category: 'Dynamic',
  },
  {
    id: 'BOUNCE_WAVE',
    label: 'Bounce Wave',
    description: 'Staggered playful kinetic spring bounce across words',
    icon: '🌊',
    previewText: 'Exciting news and celebrations ahead!',
    category: 'Dynamic',
  },
  {
    id: 'CYBER_GLITCH',
    label: 'Electric Cyber Glitch',
    description: 'High-tech chromatic displacement and cyber flicker',
    icon: '⚡',
    previewText: 'SYSTEM UPDATE // HACKATHON PROTOCOL INITIALIZED',
    category: 'Modern',
  },
  {
    id: 'SPARKLE_PULSE',
    label: 'Sparkle & Pulse',
    description: 'Pulsing rhythmic glow with floating golden star sparkles',
    icon: '🌟',
    previewText: '🏆 Congratulations to all championship winners! 🎉',
    category: 'Modern',
  },
  {
    id: 'CINEMATIC_BLUR',
    label: 'Cinematic Blur Reveal',
    description: 'Ultra-smooth optical blur-to-sharp focus entrance',
    icon: '🎬',
    previewText: 'Campus Placement Drive 2026 Registration Open',
    category: 'Subtle',
  },
  {
    id: 'FLIP_3D',
    label: '3D Perspective Flip',
    description: 'Staggered 3D card tilt and rotational entrance',
    icon: '🔄',
    previewText: 'Discover new academic opportunities today',
    category: 'Modern',
  },
  {
    id: 'GRADIENT_FLOW',
    label: 'Sunset Gradient Flow',
    description: 'Continuously shifting vibrant multi-color flowing gradient',
    icon: '🔥',
    previewText: 'Ignite your learning journey with AttendEase',
    category: 'Modern',
  },
  {
    id: 'BREAKING_FLASH',
    label: 'Breaking Alert Flash',
    description: 'High-visibility beacon strobe with attention-grabbing border',
    icon: '🚨',
    previewText: 'URGENT: Semester Examination Schedule Released',
    category: 'Urgent',
  },
  {
    id: 'NONE',
    label: 'Clean Text (No Animation)',
    description: 'Standard modern typography without motion',
    icon: '📄',
    previewText: 'Standard clean announcement text.',
    category: 'Subtle',
  },
];

export interface AnnouncementTemplatePreset {
  id: TemplatePresetId;
  name: string;
  tagline: string;
  icon: string;
  defaultTitle: string;
  defaultContent: string;
  badge: string;
  animation: TextAnimationType;
  gradientTheme: GradientThemeId;
  buttonText: string;
  buttonUrl: string;
  previewBg: string;
}

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplatePreset[] = [
  {
    id: 'EXAM_ALERT',
    name: 'Urgent Exam & Academic Alert',
    tagline: 'High priority notices, mid-term & final timetable releases',
    icon: '🚨',
    defaultTitle: 'Semester Examination Timetable Published',
    defaultContent: 'The End Semester Theory & Lab examinations timetable has been officially released. Download the subject-wise schedule now.',
    badge: '⚠️ URGENT NOTICE',
    animation: 'BREAKING_FLASH',
    gradientTheme: 'amber_rose',
    buttonText: 'View Schedule',
    buttonUrl: '#',
    previewBg: 'from-amber-950/80 via-rose-950/80 to-slate-950',
  },
  {
    id: 'SPORTS_FEST',
    name: 'Sports & Fest Spotlight',
    tagline: 'High energy tournaments, cultural fests & live scores',
    icon: '🏆',
    defaultTitle: 'HPL 2026 Cricket Tournament Live',
    defaultContent: 'Semi-Final Match is now live! CSIT Warriors vs ECE Titans. Follow the live ball-by-ball score and player statistics.',
    badge: '🔴 LIVE MATCH',
    animation: 'NEON_SHIMMER',
    gradientTheme: 'emerald_cyan',
    buttonText: 'Watch Live Score',
    buttonUrl: 'https://csdcsitcricket.up.railway.app/widget/live',
    previewBg: 'from-emerald-950/80 via-teal-950/80 to-slate-950',
  },
  {
    id: 'CELEBRATION',
    name: 'Celebration & Achievement',
    tagline: 'Hackathon winners, fest honors, and student achievements',
    icon: '🎉',
    defaultTitle: 'Grand Winners: National AI Hackathon 2026',
    defaultContent: 'Huge congratulations to Team AttendEase for bagging 1st place in the National Smart Campus Innovation Challenge!',
    badge: '🏆 CONGRATULATIONS',
    animation: 'SPARKLE_PULSE',
    gradientTheme: 'royal_gold',
    buttonText: 'See Hall of Fame',
    buttonUrl: '#',
    previewBg: 'from-purple-950/80 via-amber-950/80 to-slate-950',
  },
  {
    id: 'CAMPUS_NOTICE',
    name: 'Campus Schedule & News Ticker',
    tagline: 'General notices, library hours, bus timings & holiday updates',
    icon: '📢',
    defaultTitle: 'Campus Facility & Transport Update',
    defaultContent: 'Special campus transport buses will operate until 7:30 PM this week due to project exhibition practice sessions.',
    badge: '📢 CAMPUS UPDATE',
    animation: 'MARQUEE_TICKER',
    gradientTheme: 'indigo_purple',
    buttonText: 'Read Circular',
    buttonUrl: '#',
    previewBg: 'from-indigo-950/80 via-blue-950/80 to-slate-950',
  },
  {
    id: 'PLACEMENT_DRIVE',
    name: 'Placements & Career Drive',
    tagline: 'Campus recruitment drives, internships, and interview schedules',
    icon: '🚀',
    defaultTitle: 'Google & Microsoft Campus Hiring Drive',
    defaultContent: 'Registrations are open for 3rd & 4th Year B.Tech students for upcoming technical recruitment and software internships.',
    badge: '💼 CAREER DRIVE',
    animation: 'CINEMATIC_BLUR',
    gradientTheme: 'cyber_neon',
    buttonText: 'Apply on Portal',
    buttonUrl: '#',
    previewBg: 'from-cyan-950/80 via-indigo-950/80 to-slate-950',
  },
  {
    id: 'TIP_NOTICE',
    name: 'Pro-Tip & Attendance Wisdom',
    tagline: 'Smart tips for students to maintain high attendance and OD balance',
    icon: '💡',
    defaultTitle: 'Attendance Tip: Submit OD Requests 24h Ahead',
    defaultContent: 'Submitting On-Duty and Medical requests with required proof within 24 hours accelerates faculty approvals significantly.',
    badge: '💡 ATTENDANCE PRO-TIP',
    animation: 'GRADIENT_FLOW',
    gradientTheme: 'sunset_flame',
    buttonText: 'Learn Policy',
    buttonUrl: '#',
    previewBg: 'from-orange-950/80 via-amber-950/80 to-slate-950',
  },
];

export const GRADIENT_THEMES: Record<
  GradientThemeId,
  {
    name: string;
    borderGradient: string;
    backgroundGradient: string;
    textGradient: string;
    badgeStyle: string;
    accentColor: string;
  }
> = {
  indigo_purple: {
    name: 'Indigo Astral',
    borderGradient: 'from-indigo-500 via-purple-500 to-pink-500',
    backgroundGradient: 'from-slate-950 via-indigo-950/70 to-slate-900',
    textGradient: 'from-indigo-200 via-purple-200 to-pink-200',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    accentColor: '#6366f1',
  },
  amber_rose: {
    name: 'Amber Crimson (Alert)',
    borderGradient: 'from-amber-500 via-rose-500 to-red-500',
    backgroundGradient: 'from-slate-950 via-rose-950/60 to-slate-900',
    textGradient: 'from-amber-200 via-rose-200 to-orange-200',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentColor: '#f43f5e',
  },
  emerald_cyan: {
    name: 'Emerald Energy (Sports)',
    borderGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    backgroundGradient: 'from-slate-950 via-emerald-950/60 to-slate-900',
    textGradient: 'from-emerald-200 via-teal-200 to-cyan-200',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
  },
  cyber_neon: {
    name: 'Cyber Neon (Tech)',
    borderGradient: 'from-cyan-400 via-blue-500 to-purple-600',
    backgroundGradient: 'from-slate-950 via-cyan-950/60 to-slate-900',
    textGradient: 'from-cyan-200 via-sky-200 to-blue-200',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentColor: '#06b6d4',
  },
  sunset_flame: {
    name: 'Sunset Flame',
    borderGradient: 'from-orange-500 via-amber-500 to-yellow-400',
    backgroundGradient: 'from-slate-950 via-orange-950/60 to-slate-900',
    textGradient: 'from-orange-200 via-amber-200 to-yellow-200',
    badgeStyle: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentColor: '#f97316',
  },
  royal_gold: {
    name: 'Royal Purple & Gold',
    borderGradient: 'from-amber-400 via-purple-500 to-pink-500',
    backgroundGradient: 'from-slate-950 via-purple-950/70 to-slate-900',
    textGradient: 'from-amber-200 via-yellow-100 to-purple-200',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentColor: '#eab308',
  },
  dark_slate: {
    name: 'Minimal Slate',
    borderGradient: 'from-slate-600 via-slate-500 to-slate-700',
    backgroundGradient: 'from-slate-950 via-slate-900 to-slate-950',
    textGradient: 'from-slate-100 via-slate-200 to-slate-300',
    badgeStyle: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
    accentColor: '#64748b',
  },
};

/**
 * Parses announcement content string into structured payload if animated JSON,
 * otherwise falls back seamlessly to standard raw string.
 */
export function parseAnnouncementContent(rawContent: string | null | undefined): {
  isAnimated: boolean;
  text: string;
  animation: TextAnimationType;
  template: TemplatePresetId;
  badge?: string;
  gradientTheme: GradientThemeId;
  speed: 'slow' | 'normal' | 'fast';
} {
  if (!rawContent || !rawContent.trim()) {
    return {
      isAnimated: false,
      text: '',
      animation: 'NONE',
      template: 'CUSTOM',
      gradientTheme: 'indigo_purple',
      speed: 'normal',
    };
  }

  const trimmed = rawContent.trim();

  if (trimmed.startsWith('{') && trimmed.includes('"isAnimated"')) {
    try {
      const parsed = JSON.parse(trimmed) as AnimatedAnnouncementPayload;
      if (parsed && parsed.isAnimated) {
        return {
          isAnimated: true,
          text: parsed.text || '',
          animation: parsed.animation || 'NONE',
          template: parsed.template || 'CUSTOM',
          badge: parsed.badge,
          gradientTheme: parsed.gradientTheme || 'indigo_purple',
          speed: parsed.speed || 'normal',
        };
      }
    } catch {
      // JSON parse error, treat as raw text
    }
  }

  return {
    isAnimated: false,
    text: trimmed,
    animation: 'NONE',
    template: 'CUSTOM',
    gradientTheme: 'indigo_purple',
    speed: 'normal',
  };
}

/**
 * Serializes animation settings and text into string for announcement `content`.
 */
export function serializeAnnouncementContent(payload: {
  text: string;
  animation: TextAnimationType;
  template?: TemplatePresetId;
  badge?: string;
  gradientTheme?: GradientThemeId;
  speed?: 'slow' | 'normal' | 'fast';
}): string {
  if (payload.animation === 'NONE' && !payload.badge && !payload.gradientTheme) {
    return payload.text;
  }

  const data: AnimatedAnnouncementPayload = {
    isAnimated: true,
    text: payload.text,
    animation: payload.animation,
    template: payload.template || 'CUSTOM',
    badge: payload.badge,
    gradientTheme: payload.gradientTheme || 'indigo_purple',
    speed: payload.speed || 'normal',
  };

  return JSON.stringify(data);
}
