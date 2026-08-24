import { useState } from 'react';
import { motion } from 'framer-motion';

interface NotFoundProps {
  code?: string | number;
  title?: string;
}

export default function NotFound({
  code = '404',
  title = 'This page could not be found.',
}: NotFoundProps) {
  const [dropKey, setDropKey] = useState(0);
  const is404 = String(code) === '404';

  const triggerGravityDrop = () => {
    setDropKey(prev => prev + 1);
  };

  return (
    <div
      onClick={triggerGravityDrop}
      className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden cursor-pointer selection:bg-orange-500 selection:text-white"
      title="Click anywhere to trigger 100% Gravity Drop"
    >
      {/* Subtle warm orange ambient aura */}
      <div className="absolute w-96 h-96 rounded-full bg-orange-500/5 blur-3xl pointer-events-none -z-10" />

      <div key={dropKey} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        
        {/* 100 Gravity Heavy Physics Drop on Digits with Orange Theme */}
        {is404 ? (
          <div className="flex items-center text-[36px] sm:text-[46px] font-mono font-black tracking-wider leading-none">
            {/* First '4' */}
            <motion.span
              initial={{ y: -380, rotate: -25, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 550,
                damping: 14,
                mass: 1.4,
                delay: 0.05,
              }}
              className="inline-block text-[#18181b]"
            >
              4
            </motion.span>

            {/* Center '0' in signature Orange */}
            <motion.span
              initial={{ y: -450, rotate: 45, opacity: 0 }}
              animate={{ y: 0, rotate: -8, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 600,
                damping: 12,
                mass: 1.6,
                delay: 0.15,
              }}
              className="inline-block mx-1 text-orange-500 drop-shadow-[0_2px_8px_rgba(249,115,22,0.25)]"
            >
              0
            </motion.span>

            {/* Second '4' */}
            <motion.span
              initial={{ y: -400, rotate: 30, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 520,
                damping: 15,
                mass: 1.3,
                delay: 0.22,
              }}
              className="inline-block text-[#18181b]"
            >
              4
            </motion.span>
          </div>
        ) : (
          <motion.span
            initial={{ y: -400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 550,
              damping: 14,
              mass: 1.4,
            }}
            className="text-[36px] sm:text-[46px] font-mono font-black text-orange-500 tracking-tight inline-block drop-shadow-xs"
          >
            {code}
          </motion.span>
        )}

        {/* Orange Accent Divider */}
        <motion.div
          initial={{ y: -350, opacity: 0, scaleY: 0.2 }}
          animate={{ y: 0, opacity: 1, scaleY: 1 }}
          transition={{
            type: 'spring',
            stiffness: 480,
            damping: 16,
            delay: 0.28,
          }}
          className="hidden sm:block w-[2px] h-8 bg-orange-400/80 rounded-full"
        />

        {/* Title Dropping & Landing */}
        <motion.span
          initial={{ y: -320, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 450,
            damping: 18,
            mass: 1.1,
            delay: 0.35,
          }}
          className="text-[14px] sm:text-[15px] text-[#4b5563] font-medium tracking-normal inline-block"
        >
          {title}
        </motion.span>

      </div>

      {/* Orange Ground Impact Shockwave Line */}
      <motion.div
        key={`ground-${dropKey}`}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.6, delay: 0.28, ease: 'easeOut' }}
        className="w-52 h-[1.5px] bg-orange-500/60 mt-3.5 rounded-full pointer-events-none"
      />
    </div>
  );
}
