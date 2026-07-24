import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function RequestSuccess() {
  const navigate = useNavigate();

  return (
    <PageWrapper role="student">
      <div className="max-w-md mx-auto py-6 sm:py-10 px-4 flex flex-col items-center justify-center text-center">

        {/* Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full flex flex-col items-center text-center"
          style={{
            borderRadius: 24,
            border: '1px solid #F1F5F9',
            boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
            background: '#FFFFFF',
          }}
        >
          <div className="px-7 pt-12 pb-10 sm:px-10 sm:pt-14 sm:pb-12 w-full flex flex-col items-center">

            {/* ── Orange check circle ── */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.1, type: 'spring', stiffness: 170, damping: 14 }}
              className="mb-6"
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(249,115,22,0.30)',
                }}
              >
                <Check size={40} className="text-white" strokeWidth={2.8} />
              </div>
            </motion.div>

            {/* ── Title ── */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.22 }}
              className="text-[26px] sm:text-[30px] font-heading font-extrabold text-slate-900 mb-2.5 leading-tight"
            >
              Request Sent
            </motion.h1>

            {/* ── Subtitle ── */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.28 }}
              className="text-[14px] sm:text-[15px] text-slate-400 leading-relaxed max-w-[300px] mx-auto mb-10"
            >
              Your attendance permission request has been submitted and is under review.
            </motion.p>

            {/* ── Status Timeline ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.34 }}
              className="w-full mb-10"
            >
              <div className="flex items-start justify-center gap-0 w-full" style={{ maxWidth: 300, margin: '0 auto' }}>
                {/* Step 1: Submitted */}
                <div className="flex flex-col items-center gap-2" style={{ minWidth: 70 }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#F97316' }}
                  >
                    <Check size={20} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-bold text-orange-500">Submitted</span>
                </div>

                {/* Connector 1 */}
                <div className="flex-1 pt-5">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
                    style={{
                      height: 2.5,
                      borderRadius: 999,
                      background: '#F97316',
                      transformOrigin: 'left',
                    }}
                  />
                </div>

                {/* Step 2: Reviewing */}
                <div className="flex flex-col items-center gap-2" style={{ minWidth: 70 }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#FFFFFF', border: '2px solid #F97316' }}
                  >
                    <Clock size={18} className="text-orange-500" />
                  </div>
                  <span className="text-[11px] font-bold text-orange-500">Reviewing</span>
                </div>

                {/* Connector 2 */}
                <div className="flex-1 pt-5">
                  <div
                    style={{
                      height: 2.5,
                      borderRadius: 999,
                      background: '#E2E8F0',
                    }}
                  />
                </div>

                {/* Step 3: Decision */}
                <div className="flex flex-col items-center gap-2" style={{ minWidth: 70 }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#FFFFFF', border: '2px solid #CBD5E1' }}
                  >
                    <Check size={18} className="text-slate-300" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Decision</span>
                </div>
              </div>
            </motion.div>

            {/* ── Buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.42 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <button
                onClick={() => navigate('/student')}
                className="active:scale-[0.97] transition-all"
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 14,
                  background: '#F97316',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Back to Home
              </button>

              <button
                onClick={() => navigate('/student/history')}
                className="active:opacity-70 transition-all"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0',
                  textDecoration: 'underline',
                  textDecorationColor: 'transparent',
                  textUnderlineOffset: 3,
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#94A3B8')}
                onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
              >
                View History
              </button>
            </motion.div>

          </div>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
