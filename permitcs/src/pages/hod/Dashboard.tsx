import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { mockRequests, mockFaculty } from '../../data/mock';
import { formatDate, formatTimeAgo, DEPARTMENTS } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
] as const;

type TabValue = 'all' | 'pending' | 'approved' | 'rejected';

export default function HODDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [tab, setTab] = useState<TabValue>('all');

  const filtered = mockRequests.filter(req => {
    const matchesTab = tab === 'all' || req.status === tab;
    const matchesSearch =
      req.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      req.faculty?.name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    return matchesTab && matchesSearch && matchesDept;
  });

  // Summary counts
  const counts = {
    pending: mockRequests.filter(r => r.status === 'pending').length,
    approved: mockRequests.filter(r => r.status === 'approved').length,
    rejected: mockRequests.filter(r => r.status === 'rejected').length,
    total: mockRequests.length,
  };

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-[#111111]">HOD Overview</h1>
              <p className="text-[14px] text-[#6B7280] mt-1">
                {user?.department} · All requests across faculty
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Avatar name={user?.name || 'H'} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-[#111111]">{user?.name}</p>
                <p className="text-[12px] text-[#6B7280]">Head of Department</p>
              </div>
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total', value: counts.total, color: 'text-[#111111]' },
              { label: 'Pending', value: counts.pending, color: 'text-warning' },
              { label: 'Approved', value: counts.approved, color: 'text-success' },
              { label: 'Rejected', value: counts.rejected, color: 'text-danger' },
            ].map(stat => (
              <div key={stat.label} className="card px-4 py-3">
                <p className={`text-[22px] font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty summary */}
        <div className="mb-8">
          <h2 className="text-[16px] font-semibold text-[#111111] mb-3">Faculty at a Glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {mockFaculty.map(fac => {
              const facRequests = mockRequests.filter(r => r.facultyId === fac.id);
              const facPending = facRequests.filter(r => r.status === 'pending').length;
              return (
                <div key={fac.id} className="card px-4 py-3 flex items-center gap-3">
                  <Avatar name={fac.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#111111] truncate">{fac.name}</p>
                    <p className="text-[12px] text-[#6B7280]">
                      {facRequests.length} requests · {facPending} pending
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <h2 className="text-[16px] font-semibold text-[#111111] mb-3">All Requests</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search student, reason, or faculty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[14px] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10 transition-all"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-[14px] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111111] appearance-none cursor-pointer text-[#111111] min-w-[160px]"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-xl w-fit">
            {STATUS_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                  tab === t.value
                    ? 'bg-white text-[#111111] shadow-subtle'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setDepartment(''); setTab('all'); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
            {filtered.map(req => (
              <motion.div
                key={req.id}
                variants={itemVariants}
                onClick={() => navigate(`/hod/request/${req.id}`)}
                className="card px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={req.student?.name || 'S'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[15px] font-medium text-[#111111]">{req.student?.name}</span>
                      <span className="text-[13px] text-[#9CA3AF]">{req.student?.rollNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#6B7280] flex-wrap">
                      <span>{req.reasonLabel}</span>
                      <span>·</span>
                      <span>{formatDate(req.date)}</span>
                      <span>·</span>
                      <span className="hidden sm:inline">{req.faculty?.name}</span>
                      <span className="hidden sm:inline">·</span>
                      <span>{formatTimeAgo(req.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={req.status} className="ml-3 flex-shrink-0" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
