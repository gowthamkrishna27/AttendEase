import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  size?: 'sm' | 'md';
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full
              ${size === 'sm' ? 'max-w-sm' : 'max-w-md'}
              bg-white border border-[#E5E7EB] rounded-2xl shadow-card p-6`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-[#111111]">{title}</h2>
                {description && (
                  <p className="text-[14px] text-[#6B7280] mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[#F3F4F6] transition-colors text-[#6B7280]"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
