import React from 'react';
import { motion } from 'framer-motion';
import logoImg from '../../assets/srkr-emblem.png';

interface LogoPulseSplashProps {
  onFinish?: () => void;
}

export const LogoPulseSplash: React.FC<LogoPulseSplashProps> = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 select-none font-sans"
    >
      {/* Soft Glow + Pulsing Logo Container */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Soft Background Orange Glow */}
        <motion.div
          animate={{
            scale: [0.95, 1.08, 1.0],
            opacity: [0.3, 0.6, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-44 h-44 rounded-full bg-[#FF7A00]/20 blur-2xl pointer-events-none"
        />

        {/* Logo Image with 1.2s Heartbeat Pulse & Opacity */}
        <motion.img
          src={logoImg}
          alt="AttendEase Logo"
          animate={{
            scale: [0.95, 1.05, 1.0],
            opacity: [0.9, 1.0, 0.9],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-36 h-36 object-contain drop-shadow-md z-10"
        />
      </div>

      {/* App Branding Text */}
      <div className="text-center">
        <h1 className="text-[32px] font-heading font-black tracking-tight flex items-center justify-center gap-0.5 mb-1.5">
          <span className="text-[#1E1E1E]">Attend</span>
          <span className="text-[#FF7A00]">Ease</span>
        </h1>
        <p className="text-[12px] font-bold text-[#6B7280] uppercase tracking-widest">
          GET PERMISSION FROM ANYWHERE
        </p>
      </div>

      {/* Subtle Bottom Loading Indicator */}
      <div className="absolute bottom-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
        <span className="text-[11px] font-semibold text-slate-400">Loading secure workspace...</span>
      </div>
    </motion.div>
  );
};
