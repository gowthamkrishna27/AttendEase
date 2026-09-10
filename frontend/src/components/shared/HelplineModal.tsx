import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MessageSquare, X, ExternalLink, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface HelplineContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export const HELPLINE_CONTACTS: HelplineContact[] = [
  {
    name: 'Chundru Gowtham Krishna',
    role: 'System Architect & Lead Developer',
    phone: '+91 99635 45352',
    email: 'gowthamkrishna18v@gmail.com',
    whatsapp: '919963545352',
  },
  {
    name: 'Chandani Vivekananda',
    role: 'Full-Stack Developer & UI/UX',
    phone: '+91 90634 49226',
    email: 'chandanivivek770@gmail.com',
    whatsapp: '919063449226',
  },
  {
    name: 'K. V. Sunil Varma',
    role: 'AttendEase Project Coordinator',
    phone: '+91 91608 01908',
    email: 'kvsunilvarma@srkrec.ac.in',
    whatsapp: '919160801908',
  },
];

interface HelplineModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const HelplineModal: React.FC<HelplineModalProps> = ({
  isOpen,
  onClose,
  title = 'Helpline & Support',
  subtitle = 'Direct technical assistance contacts',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 text-slate-900"
        >
          {/* Minimal Clean Top Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Phone size={16} />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-slate-900 leading-tight m-0">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium m-0">
                  {subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Contact Cards List */}
          <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
            {HELPLINE_CONTACTS.map((contact, idx) => {
              const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
              return (
                <div
                  key={contact.name}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="mb-2.5">
                    <h4 className="font-bold text-[13.5px] text-slate-900 m-0 leading-tight">
                      {contact.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-orange-600">
                      {contact.role}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {contact.phone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 text-slate-800 hover:text-orange-600 border border-slate-200 text-[11.5px] font-bold transition-all shadow-2xs"
                        title={`Call ${contact.name}`}
                      >
                        <Phone size={12} className="text-orange-500" />
                        <span>{contact.phone}</span>
                      </a>
                    )}

                    {contact.whatsapp && (
                      <a
                        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hello AttendEase Support, I need assistance regarding:')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 text-[11.5px] font-bold transition-all shadow-2xs"
                        title="WhatsApp"
                      >
                        <MessageSquare size={12} className="text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {contact.email && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-[11.5px] font-medium shadow-2xs">
                        <Mail size={12} className="text-slate-400" />
                        <span className="text-[11px] truncate max-w-[140px]">{contact.email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(contact.email!, `email-${idx}`)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedKey === `email-${idx}` ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Minimal Footer */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
            <a
              href="https://forms.gle/girGw3vVdUfCR5zR6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 hover:underline"
            >
              <ExternalLink size={12} />
              <span>Submit Issue Report</span>
            </a>

            <span className="text-[11px] text-slate-400">
              AttendEase Support
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default HelplineModal;
