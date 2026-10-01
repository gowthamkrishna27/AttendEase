import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const isVisible = open ?? isOpen ?? false;
  return (
    <AnimatePresence>
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          {/* Backdrop overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.40)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'relative',
              zIndex: 101,
              width: '100%',
              maxWidth: size === 'sm' ? 400 : size === 'xl' ? 840 : size === 'lg' ? 620 : 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.14), 0 4px 12px -4px rgba(0, 0, 0, 0.08)',
              padding: '20px 24px 24px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: '1.3' }}>{title}</h2>
                {description && (
                  <p style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 3, lineHeight: '1.4' }}>{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flexShrink: 0,
                  width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0',
                  background: '#F8FAFC', color: '#94A3B8', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.12s',
                  marginTop: 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
              >
                <X size={14} />
              </button>
            </div>
            <div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
