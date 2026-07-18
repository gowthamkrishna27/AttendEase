import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { studentRequests } from '../../data/mock';
import { formatDateShort, formatTimeAgo } from '../../lib/utils';

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function StudentHome() {
  const navigate = useNavigate();
  const recent = studentRequests.slice(0, 5);

  return (
    <PageWrapper role="student">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-[32px] font-bold text-[#111111] leading-tight mb-2">
            {getGreeting()} 👋
          </h1>
          <p className="text-[16px] text-[#6B7280]">Need attendance permission?</p>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => navigate('/student/new-request')}
              className="gap-2"
            >
              <Plus size={18} />
              New Request
            </Button>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-[#111111]">Recent Requests</h2>
            <button
              onClick={() => navigate('/student/history')}
              className="text-[14px] font-medium text-[#6B7280] hover:text-[#111111] transition-colors"
            >
              View all
            </button>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Submit your first attendance permission request to get started."
              action={
                <Button onClick={() => navigate('/student/new-request')}>
                  New Request
                </Button>
              }
            />
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {recent.map(req => (
                <motion.button
                  key={req.id}
                  variants={itemVariants}
                  onClick={() => navigate(`/student/request/${req.id}`)}
                  className="w-full text-left card px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors duration-150 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[15px] font-medium text-[#111111]">
                        {req.reasonLabel}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-[13px] text-[#6B7280]">
                      {formatDateShort(req.date)} · {formatTimeAgo(req.submittedAt)}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors flex-shrink-0 ml-2"
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
