import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Check, X } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { mockRequests, mockFaculty } from '../../data/mock';
import { formatTimeAgo, DEPARTMENTS } from '../../lib/utils';
import type { AttendanceRequest } from '../../types';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>(mockRequests);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pending = requests.filter(r => {
    const matchesSearch =
      r.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.reasonLabel.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || r.student?.department === department;
    return matchesSearch && matchesDept;
  });

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'approved' as const } : r))
    );
  };

  const handleReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'rejected' as const } : r))
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <PageWrapper role="faculty">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-[#111111]">Pending Requests</h1>
              <p className="text-[14px] text-[#6B7280] mt-1">
                {pendingCount} request{pendingCount !== 1 ? 's' : ''} awaiting your review
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Avatar name={mockFaculty[0].name} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-[#111111]">{mockFaculty[0].name}</p>
                <p className="text-[12px] text-[#6B7280]">{mockFaculty[0].department}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="text"
              placeholder="Search by student or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[14px] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10 transition-all"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
            />
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-[14px] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111111] appearance-none cursor-pointer text-[#111111] min-w-[180px]"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Request List */}
        {pending.length === 0 ? (
          <EmptyState
            title="No requests found"
            description={
              search || department
                ? 'Try adjusting your filters.'
                : 'All requests have been reviewed.'
            }
            action={
              (search || department) ? (
                <Button variant="secondary" onClick={() => { setSearch(''); setDepartment(''); }}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {pending.map(req => (
              <motion.div
                key={req.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredId(req.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="card px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors duration-150 group cursor-pointer"
                onClick={() => navigate(`/faculty/request/${req.id}`)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={req.student?.name || 'S'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[15px] font-medium text-[#111111]">
                        {req.student?.name}
                      </span>
                      <span className="text-[13px] text-[#9CA3AF]">
                        {req.student?.rollNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#6B7280] flex-wrap">
                      <span>{req.reasonLabel}</span>
                      <span>·</span>
                      <span>{req.student?.department}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(req.submittedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <StatusBadge status={req.status} />

                  {/* Hover actions — only show for pending */}
                  {req.status === 'pending' && (
                    <div
                      className={`flex items-center gap-1.5 transition-all duration-150 ${
                        hoveredId === req.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <button
                        onClick={e => handleApprove(req.id, e)}
                        className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 text-success transition-colors"
                        title="Approve"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={e => handleReject(req.id, e)}
                        className="p-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger transition-colors"
                        title="Reject"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
