import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import type { AnnouncementItem } from '../../lib/api';
import * as api from '../../lib/api';
import { parseAnnouncementContent, GRADIENT_THEMES } from './announcementTemplates';
import { AnimatedAnnouncementText } from './AnimatedAnnouncementText';

interface AnnouncementWidgetProps {
  announcement: AnnouncementItem;
}

export const AnnouncementWidget: React.FC<AnnouncementWidgetProps> = ({ announcement }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const handleExternalClick = () => {
    api.trackAnnouncementClick(announcement.id);
  };

  const parsed = parseAnnouncementContent(announcement.content);
  const theme = GRADIENT_THEMES[parsed.gradientTheme] || GRADIENT_THEMES.indigo_purple;

  // Dimensions computation
  const widgetHeight = announcement.height || 185;
  const widgetWidth = announcement.width ? `${announcement.width}px` : '100%';
  const isFullWidth = announcement.fullWidth;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] mb-6 ${
        isFullWidth ? 'w-full' : 'max-w-[420px] w-full'
      }`}
      style={{
        maxWidth: isFullWidth ? '100%' : (announcement.width ? `${announcement.width}px` : '420px'),
      }}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <h3 className="text-[13px] font-bold text-slate-900 tracking-tight truncate">
            {announcement.title}
          </h3>
        </div>

        {announcement.externalUrl && (
          <a
            href={announcement.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalClick}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-orange-600 hover:text-orange-700 hover:underline shrink-0"
          >
            <span>{announcement.buttonText || 'Full View'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Widget Body */}
      <div
        className="relative w-full overflow-hidden bg-slate-900/5 flex items-center justify-center"
        style={{ minHeight: widgetHeight }}
      >
        {/* IFRAME Rendering */}
        {announcement.mediaType === 'IFRAME' && announcement.srcUrl && (
          <div className="relative w-full flex items-center justify-center" style={{ height: widgetHeight }}>
            {!iframeLoaded && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-[11px] font-medium">Loading live feed...</span>
              </div>
            )}

            {iframeError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-600">
                <AlertTriangle className="w-7 h-7 text-amber-500 mb-2" />
                <p className="text-[12.5px] font-medium mb-3">Live feed could not be embedded directly.</p>
                {announcement.externalUrl && (
                  <a
                    href={announcement.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleExternalClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-medium shadow-sm transition-all"
                  >
                    <span>Open in Full Screen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <iframe
                src={announcement.srcUrl}
                title={announcement.title}
                width={widgetWidth}
                height={widgetHeight}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setIframeLoaded(true)}
                onError={() => setIframeError(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  maxWidth: '100%',
                  display: 'block',
                }}
              />
            )}
          </div>
        )}

        {/* IMAGE Rendering */}
        {announcement.mediaType === 'IMAGE' && announcement.srcUrl && (
          <div className="w-full relative overflow-hidden" style={{ height: widgetHeight }}>
            <img
              src={announcement.srcUrl}
              alt={announcement.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* VIDEO Rendering */}
        {announcement.mediaType === 'VIDEO' && announcement.srcUrl && (
          <div className="w-full relative overflow-hidden bg-black" style={{ height: widgetHeight }}>
            <video
              src={announcement.srcUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* TEXT / ANIMATED TEMPLATE Rendering */}
        {announcement.mediaType === 'TEXT' && (
          <div
            className={`p-5 w-full h-full flex flex-col justify-center rounded-b-2xl bg-gradient-to-br ${theme.backgroundGradient} text-white`}
            style={{ minHeight: widgetHeight }}
          >
            {parsed.badge && (
              <div className="mb-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${theme.badgeStyle}`}
                >
                  {parsed.badge}
                </span>
              </div>
            )}
            <div className="text-[13.5px] leading-relaxed text-slate-100">
              <AnimatedAnnouncementText
                text={parsed.text}
                animation={parsed.animation}
                gradientTheme={parsed.gradientTheme}
                speed={parsed.speed}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
