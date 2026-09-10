import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ArrowRight, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { AnnouncementItem } from '../../lib/api';
import * as api from '../../lib/api';
import { parseAnnouncementContent, GRADIENT_THEMES } from './announcementTemplates';
import { AnimatedAnnouncementText } from './AnimatedAnnouncementText';

interface AnnouncementBannerProps {
  announcement: AnnouncementItem;
  onDismiss?: (id: string) => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const parsed = parseAnnouncementContent(announcement.content);
  const theme = GRADIENT_THEMES[parsed.gradientTheme] || GRADIENT_THEMES.indigo_purple;

  const handleDismiss = () => {
    setIsVisible(false);
    api.dismissAnnouncement(announcement.id);
    if (onDismiss) {
      onDismiss(announcement.id);
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
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full mb-5"
        >
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.borderGradient} p-[1.5px] shadow-lg shadow-black/20`}
          >
            {/* Ambient Background & Body */}
            <div
              className={`relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[15px] bg-gradient-to-r ${theme.backgroundGradient} backdrop-blur-xl px-5 py-4 sm:px-6 sm:py-4.5 text-white`}
            >
              {/* Left Content Area */}
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${theme.badgeStyle}`}
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Badge & Title */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${theme.badgeStyle}`}
                    >
                      {parsed.badge || 'Announcement'}
                    </span>
                    <h3 className="text-[14px] sm:text-[15.5px] font-bold text-white tracking-tight">
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
                    </h3>
                  </div>

                  {/* Body / Content */}
                  {parsed.text && (
                    <div className="text-[12.5px] sm:text-[13px] text-slate-200/95 leading-relaxed overflow-hidden">
                      {parsed.isAnimated ? (
                        <AnimatedAnnouncementText
                          text={parsed.text}
                          animation={parsed.animation}
                          gradientTheme={parsed.gradientTheme}
                          speed={parsed.speed}
                        />
                      ) : (
                        <p className="line-clamp-2">{parsed.text}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Media preview in banner if image */}
              {announcement.mediaType === 'IMAGE' && announcement.srcUrl && (
                <div className="w-full md:w-48 h-24 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                  <img
                    src={announcement.srcUrl}
                    alt={announcement.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Media preview in banner if video */}
              {announcement.mediaType === 'VIDEO' && announcement.srcUrl && (
                <div className="relative w-full md:w-56 h-28 rounded-lg overflow-hidden border border-slate-700/60 shrink-0 bg-black">
                  <video
                    src={announcement.srcUrl}
                    muted={isMuted}
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white/80 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Right CTA & Close Action */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t border-white/10 md:border-0">
                {announcement.buttonText && announcement.buttonUrl && (
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white text-[12.5px] font-semibold tracking-wide shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    <span>{announcement.buttonText}</span>
                    {announcement.openInNewTab ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {announcement.closable && announcement.showCloseButton && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss banner"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
