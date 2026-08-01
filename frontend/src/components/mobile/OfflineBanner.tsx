import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, onRetry }) => {
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white border-b border-rose-500/30 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 animate-pulse">
              <WifiOff size={15} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">No Internet Connection</p>
              <p className="text-[11px] text-slate-300">You are offline. Showing cached data.</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-[12px] font-medium transition-colors"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Retry</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
