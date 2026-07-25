import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
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
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
          />

          {/* Centered Modal Card Widget */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'relative',
              zIndex: 101,
              width: '100%',
              maxWidth: size === 'sm' ? 400 : size === 'lg' ? 620 : 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: 20,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h2>
                {description && (
                  <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, margin: 0 }}>{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: '#F1F5F9', color: '#64748B', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
