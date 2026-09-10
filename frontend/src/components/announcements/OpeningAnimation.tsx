import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ArrowRight, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { AnnouncementItem } from '../../lib/api';
import * as api from '../../lib/api';
import { parseAnnouncementContent, GRADIENT_THEMES } from './announcementTemplates';
import { AnimatedAnnouncementText } from './AnimatedAnnouncementText';

interface OpeningAnimationProps {
  announcement: AnnouncementItem;
  onDismiss?: (id: string) => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({
  announcement,
  onDismiss,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(
    announcement.autoCloseSeconds || null
  );
  const [isMuted, setIsMuted] = useState(true);
  const timerRef = useRef<any>(null);

  const parsed = parseAnnouncementContent(announcement.content);
  const theme = GRADIENT_THEMES[parsed.gradientTheme] || GRADIENT_THEMES.indigo_purple;

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && announcement.closable) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [announcement.closable]);

  // Auto-close countdown timer
  useEffect(() => {
    if (announcement.autoCloseSeconds && announcement.autoCloseSeconds > 0) {
      setSecondsRemaining(announcement.autoCloseSeconds);
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [announcement.autoCloseSeconds]);

  const handleClose = () => {
    setIsOpen(false);
    api.dismissAnnouncement(announcement.id);
    if (onDismiss) {
      onDismiss(announcement.id);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && announcement.backdropDismiss && announcement.closable) {
      handleClose();
    }
  };

  const handleCtaClick = () => {
    api.trackAnnouncementClick(announcement.id);
    if (announcement.buttonUrl) {
      if (announcement.openInNewTab) {
        window.open(announcement.buttonUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = announcement.buttonUrl;
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`announcement-title-${announcement.id}`}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-opacity"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b ${theme.backgroundGradient} border border-white/10 shadow-2xl text-white`}
          >
            {/* Top glowing gradient border accent */}
            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${theme.borderGradient}`} />

            {/* Header / Close button */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-xl border ${theme.badgeStyle}`}>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeStyle}`}>
                  {parsed.badge || 'Special Announcement'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {secondsRemaining !== null && secondsRemaining > 0 && (
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    Closing in {secondsRemaining}s
                  </span>
                )}

                {announcement.closable && announcement.showCloseButton && (
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close dialog"
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Media Content if Image */}
            {announcement.mediaType === 'IMAGE' && announcement.srcUrl && (
              <div className="w-full h-56 sm:h-64 bg-slate-950 overflow-hidden relative">
                <img
                  src={announcement.srcUrl}
                  alt={announcement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Media Content if Video */}
            {announcement.mediaType === 'VIDEO' && announcement.srcUrl && (
              <div className="relative w-full h-56 sm:h-64 bg-black overflow-hidden">
                <video
                  src={announcement.srcUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black transition-all"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Media Content if Iframe */}
            {announcement.mediaType === 'IFRAME' && announcement.srcUrl && (
              <div className="w-full h-64 bg-slate-950 overflow-hidden flex items-center justify-center">
                <iframe
                  src={announcement.srcUrl}
                  title={announcement.title}
                  width="100%"
                  height="100%"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ border: 'none', display: 'block' }}
                />
              </div>
            )}

            {/* Text & Action Body */}
            <div className="px-6 py-5">
              <h2
                id={`announcement-title-${announcement.id}`}
                className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2.5"
              >
                {parsed.isAnimated && parsed.animation !== 'NONE' && parsed.animation !== 'MARQUEE_TICKER' ? (
                  <AnimatedAnnouncementText
                    text={announcement.title}
                    animation={parsed.animation}
                    gradientTheme={parsed.gradientTheme}
                    speed={parsed.speed}
                    isHeading
                  />
                ) : (
                  announcement.title
                )}
              </h2>

              {parsed.text && (
                <div className="text-[13.5px] text-slate-200 leading-relaxed mb-5 max-h-48 overflow-y-auto">
                  {parsed.isAnimated ? (
                    <AnimatedAnnouncementText
                      text={parsed.text}
                      animation={parsed.animation}
                      gradientTheme={parsed.gradientTheme}
                      speed={parsed.speed}
                    />
                  ) : (
                    <p>{parsed.text}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {announcement.buttonText && announcement.buttonUrl && (
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white text-[13.5px] font-semibold shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    <span>{announcement.buttonText}</span>
                    {announcement.openInNewTab ? (
                      <ExternalLink className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                )}

                {announcement.closable && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.98] text-slate-200 hover:text-white text-[13.5px] font-medium transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
