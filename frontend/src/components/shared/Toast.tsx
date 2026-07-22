import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    bgClass: 'bg-white border-success/20',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-danger',
    bgClass: 'bg-white border-danger/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-[#6B7280]',
    bgClass: 'bg-white border-[#E5E7EB]',
  },
};

export function Toast({ message, type = 'info', visible, onClose, duration = 3000 }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card ${config.bgClass}`}
          >
            <Icon size={18} className={config.iconClass} />
            <span className="text-[14px] font-medium text-[#111111]">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook
import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const show = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
  }, []);

  const hide = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return { toast, show, hide };
}
