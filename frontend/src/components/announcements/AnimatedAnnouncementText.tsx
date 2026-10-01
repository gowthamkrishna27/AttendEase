import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Flame,
  Radio,
  Bell,
  RefreshCw,
} from 'lucide-react';
import type { TextAnimationType, GradientThemeId } from './announcementTemplates';
import { GRADIENT_THEMES } from './announcementTemplates';

interface AnimatedAnnouncementTextProps {
  text: string;
  animation?: TextAnimationType;
  gradientTheme?: GradientThemeId;
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
  titleClassName?: string;
  replayKey?: number | string;
  isHeading?: boolean;
}

export const AnimatedAnnouncementText: React.FC<AnimatedAnnouncementTextProps> = ({
  text,
  animation = 'NONE',
  gradientTheme = 'indigo_purple',
  speed = 'normal',
  className = '',
  titleClassName = '',
  replayKey,
  isHeading = false,
}) => {
  const theme = GRADIENT_THEMES[gradientTheme] || GRADIENT_THEMES.indigo_purple;

  // Speed multiplier
  const charDelay = speed === 'fast' ? 25 : speed === 'slow' ? 65 : 40;

  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    if (animation !== 'TYPEWRITER') {
      setDisplayedText(text);
      return;
    }

    setDisplayedText('');
    setIsTypingDone(false);
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        setIsTypingDone(true);
        clearInterval(interval);
      }
    }, charDelay);

    return () => clearInterval(interval);
  }, [text, animation, charDelay, replayKey]);

  // Words array for word-by-word staggered animations
  const words = useMemo(() => text.split(' '), [text]);

  // ── 1. TYPEWRITER ANIMATION ──
  if (animation === 'TYPEWRITER') {
    return (
      <span className={`inline font-mono tracking-tight ${className}`} key={replayKey}>
        <span>{displayedText}</span>
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-orange-400 rounded-sm shadow-[0_0_8px_rgba(251,146,60,0.8)]"
        />
      </span>
    );
  }

  // ── 2. NEON SHIMMER ANIMATION ──
  if (animation === 'NEON_SHIMMER') {
    return (
      <span
        key={replayKey}
        className={`relative inline-block overflow-hidden font-semibold ${className}`}
      >
        <span className="relative z-10 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
          {text}
        </span>
        {/* Animated Shimmer beam */}
        <motion.span
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-[2px] pointer-events-none transform -skew-x-12"
        />
      </span>
    );
  }

  // ── 3. MARQUEE CONTINUOUS TICKER ──
  if (animation === 'MARQUEE_TICKER') {
    const tickerSpeed = speed === 'fast' ? 14 : speed === 'slow' ? 28 : 20;
    return (
      <div className={`w-full overflow-hidden whitespace-nowrap relative flex items-center ${className}`}>
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: tickerSpeed,
              ease: 'linear',
            },
          }}
          className="inline-flex items-center gap-8 will-change-transform"
        >
          <span className="inline-flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">{text}</span>
          </span>
          <span className="text-slate-500">•</span>
          <span className="inline-flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">{text}</span>
          </span>
          <span className="text-slate-500">•</span>
        </motion.div>
      </div>
    );
  }

  // ── 4. BOUNCE WAVE (Word-by-word spring) ──
  if (animation === 'BOUNCE_WAVE') {
    return (
      <span className={`inline-flex flex-wrap gap-x-1.5 ${className}`} key={replayKey}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 12,
              delay: i * 0.08,
            }}
            whileHover={{ scale: 1.12, y: -2 }}
            className="inline-block"
          >
            {word}
          </motion.span>
        ))}
      </span>
    );
  }

  // ── 5. ELECTRIC CYBER GLITCH ──
  if (animation === 'CYBER_GLITCH') {
    return (
      <span className={`relative inline-block group ${className}`} key={replayKey}>
        <motion.span
          animate={{
            x: [0, -2, 2, -1, 1, 0],
            textShadow: [
              '0 0 0px transparent',
              '-2px 0 #06b6d4, 2px 0 #f43f5e',
              '2px 0 #06b6d4, -2px 0 #f43f5e',
              '0 0 0px transparent',
            ],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="relative z-10 font-mono font-bold tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
        >
          {text}
        </motion.span>
      </span>
    );
  }

  // ── 6. SPARKLE & PULSE ──
  if (animation === 'SPARKLE_PULSE') {
    return (
      <span className={`relative inline-flex items-center gap-1.5 ${className}`} key={replayKey}>
        <motion.span
          animate={{ rotate: [0, 180, 360], scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="text-amber-400"
        >
          <Sparkles className="w-4 h-4 fill-amber-400" />
        </motion.span>
        <motion.span
          animate={{
            scale: [1, 1.02, 1],
            filter: [
              'drop-shadow(0 0 4px rgba(234,179,8,0.3))',
              'drop-shadow(0 0 10px rgba(234,179,8,0.7))',
              'drop-shadow(0 0 4px rgba(234,179,8,0.3))',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent"
        >
          {text}
        </motion.span>
        <motion.span
          animate={{ rotate: [360, 180, 0], scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="text-amber-300"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </motion.span>
      </span>
    );
  }

  // ── 7. CINEMATIC BLUR REVEAL ──
  if (animation === 'CINEMATIC_BLUR') {
    return (
      <span className={`inline-flex flex-wrap gap-x-1.5 ${className}`} key={replayKey}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.09,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
        ))}
      </span>
    );
  }

  // ── 8. 3D PERSPECTIVE FLIP ──
  if (animation === 'FLIP_3D') {
    return (
      <span
        className={`inline-flex flex-wrap gap-x-1.5 [perspective:600px] ${className}`}
        key={replayKey}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, rotateX: 90, y: 10 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{
              duration: 0.45,
              delay: i * 0.07,
              ease: 'easeOut',
            }}
            className="inline-block transform-gpu"
          >
            {word}
          </motion.span>
        ))}
      </span>
    );
  }

  // ── 9. SUNSET GRADIENT FLOW ──
  if (animation === 'GRADIENT_FLOW') {
    return (
      <motion.span
        key={replayKey}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
        className={`inline-block font-extrabold bg-gradient-to-r from-orange-400 via-rose-400 via-amber-300 to-orange-400 bg-clip-text text-transparent ${className}`}
      >
        {text}
      </motion.span>
    );
  }

  // ── 10. BREAKING ALERT FLASH ──
  if (animation === 'BREAKING_FLASH') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} key={replayKey}>
        <motion.span
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-3 w-3 shrink-0"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
        </motion.span>
        <span className="font-bold text-rose-100 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]">
          {text}
        </span>
      </span>
    );
  }

  // ── DEFAULT: CLEAN TEXT ──
  return <span className={className}>{text}</span>;
};
