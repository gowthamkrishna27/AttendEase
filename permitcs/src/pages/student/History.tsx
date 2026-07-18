import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Search } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { studentRequests } from '../../data/mock';
import { formatDate, formatTimeAgo } from '../../lib/utils';
import type { RequestStatus } from '../../types';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const filterOptions: { label: string; value: RequestStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function History() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');

  const filtered = studentRequests.filter(req => {
    const matchesFilter = filter === 'all' || req.status === filter;
    const matchesSearch =
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      req.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <PageWrapper role="student">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-semibold text-[#111111]">History</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">All your attendance requests</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10 transition-all"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 bg-[#F3F4F6] p-1 rounded-xl w-fit">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                filter === opt.value
                  ? 'bg-white text-[#111111] shadow-subtle'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No requests found"
            description={
              search ? 'Try a different search term.' : 'No requests match the selected filter.'
            }
            action={
              search || filter !== 'all' ? (
                <Button variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => navigate('/student/new-request')}>New Request</Button>
              )
            }
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {filtered.map(req => (
              <motion.button
                key={req.id}
                variants={itemVariants}
                onClick={() => navigate(`/student/request/${req.id}`)}
                className="w-full text-left card px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors duration-150 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-[15px] font-medium text-[#111111]">
                      {req.reasonLabel}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-[#6B7280]">
                    <span>{formatDate(req.date)}</span>
                    <span>·</span>
                    <span>{req.faculty?.name || 'Faculty'}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(req.submittedAt)}</span>
                  </div>
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
    </PageWrapper>
  );
}
