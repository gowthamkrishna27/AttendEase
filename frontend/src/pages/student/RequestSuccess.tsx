import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';

export default function RequestSuccess() {
  const navigate = useNavigate();

  return (
    <PageWrapper role="student">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-success" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15, ease: 'easeOut' }}
        >
          <h1 className="text-[32px] font-bold text-[#111111] mb-2">Request Submitted</h1>
          <p className="text-[16px] text-[#6B7280] max-w-sm mx-auto">
            Your request is pending faculty review. You'll be notified when it's processed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/student')}
            >
              Back to Home
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/student/history')}
            >
              View History
            </Button>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
