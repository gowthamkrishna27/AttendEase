import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashSequence() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleComplete = () => {
    if (isFinished) return;
    setIsFinished(true);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 300);
  };

  useEffect(() => {
    // Attempt playback when mounted
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted on some platforms if not muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            // If autoplay fails entirely, advance after a short delay
            setTimeout(handleComplete, 2000);
          });
        }
      });
    }

    // Safety timeout: ensure we never get stuck on splash if video doesn't fire onEnded
    const fallbackTimer = setTimeout(() => {
      handleComplete();
    }, 6000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white select-none overflow-hidden"
          onClick={handleComplete}
        >
          {/* Pure white canvas wrapper */}
          <div className="relative w-full h-full max-w-md mx-auto flex flex-col items-center justify-center p-4 bg-white">
            <video
              ref={videoRef}
              src="/splash_animation.mp4"
              autoPlay
              muted
              playsInline
              onCanPlay={() => setIsVideoReady(true)}
              onEnded={handleComplete}
              className={`w-full max-h-[85vh] object-contain transition-opacity duration-300 ${
                isVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Subtle skip indicator */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
              className="absolute bottom-6 right-6 text-xs text-slate-400 font-medium px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 transition-colors"
            >
              Skip
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
