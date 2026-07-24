import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function RequestSuccess() {
  const navigate = useNavigate();

  return (
    <PageWrapper role="student">
      <div className="max-w-md mx-auto py-8 sm:py-12 px-4 flex flex-col items-center justify-center text-center">
        
        {/* Card Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full card p-8 sm:p-10 flex flex-col items-center text-center"
          style={{
            background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
            borderRadius: 24,
            border: '1px solid #FED7AA',
            boxShadow: '0 10px 30px rgba(249,115,22,0.08)',
          }}
        >
          {/* Animated Success Check Badge */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(249,115,22,0.35)',
              }}
            >
              <CheckCircle2 size={44} className="text-white" strokeWidth={2.2} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
          >
            <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/80 rounded-full border border-orange-200 inline-block mb-3">
              Request Submitted Successfully
            </span>
            <h1 className="text-[26px] sm:text-[30px] font-heading font-extrabold text-slate-900 mb-2.5 leading-tight">
              Permission Request Sent
            </h1>
            <p className="text-[14px] sm:text-[15px] text-slate-600 leading-relaxed mb-8 max-w-xs mx-auto">
              Your attendance permission request has been submitted and is currently pending faculty &amp; department review.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={() => navigate('/student')}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(249,115,22,0.30)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Back to Home</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate('/student/history')}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: '#F8FAFC',
                  border: '1.5px solid #E8EDF2',
                  color: '#475569',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={16} />
                <span>View History</span>
              </button>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
