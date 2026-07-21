import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Check, X, ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { mockRequests, mockFaculty } from '../../data/mock';
import { formatTimeAgo, DEPARTMENTS } from '../../lib/utils';
import type { AttendanceRequest } from '../../types';

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const borderByStatus: Record<string, string> = {
  pending:  'border-l-amber-400',
  approved: 'border-l-emerald-400',
  rejected: 'border-l-rose-400',
};

export default function FacultyDashboard() {
  const navigate   = useNavigate();
  const [search, setSearch]       = useState('');
  const [department, setDept]     = useState('');
  const [requests, setRequests]   = useState<AttendanceRequest[]>(mockRequests);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = requests.filter(r => {
    const matchesSearch =
      r.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.reasonLabel.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || r.student?.department === department;
    return matchesSearch && matchesDept;
  });

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
  };
  const handleReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
  };

  const counts = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <PageWrapper role="faculty">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <p className="text-[12px] font-bold text-teal-500 uppercase tracking-widest mb-1">
              Faculty Dashboard
            </p>
            <h1 className="text-[28px] font-heading font-bold text-slate-900">Pending Requests</h1>
            <p className="text-[14px] text-slate-400 mt-1">
              {counts.pending} request{counts.pending !== 1 ? 's' : ''} awaiting your review
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Avatar name={mockFaculty[0].name} size="md" role="faculty" />
            <div>
              <p className="text-[14px] font-semibold text-slate-800">{mockFaculty[0].name}</p>
              <p className="text-[12px] text-slate-400">{mockFaculty[0].department}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {[
            { icon: ClipboardList,  label: 'Total',    value: counts.total,    grad: 'from-teal-500 to-teal-600',    text: 'text-teal-600' },
            { icon: Clock,          label: 'Pending',  value: counts.pending,  grad: 'from-amber-500 to-amber-600',  text: 'text-amber-600' },
            { icon: CheckCircle2,   label: 'Approved', value: counts.approved, grad: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600' },
            { icon: XCircle,        label: 'Rejected', value: counts.rejected, grad: 'from-rose-500 to-rose-600',    text: 'text-rose-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card px-4 py-3.5 flex flex-col gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${s.grad}`}>
                  <Icon size={13} className="text-white" />
                </div>
                <div>
                  <p className={`text-[22px] font-heading font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search by student or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/12 transition-all shadow-subtle"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <select
              value={department}
              onChange={e => setDept(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 appearance-none cursor-pointer text-slate-700 min-w-[180px] shadow-subtle"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* ── Request List ── */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No requests found"
            description={
              search || department ? 'Try adjusting your filters.' : 'All requests have been reviewed.'
            }
            action={
              (search || department) ? (
                <Button variant="secondary" onClick={() => { setSearch(''); setDept(''); }}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
            {filtered.map(req => (
              <motion.div
                key={req.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredId(req.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`card card-hover px-5 py-4 flex items-center justify-between cursor-pointer group border-l-4 ${borderByStatus[req.status]}`}
                onClick={() => navigate(`/faculty/request/${req.id}`)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={req.student?.name || 'S'} size="sm" role="faculty" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[15px] font-semibold text-slate-800">
                        {req.student?.name}
                      </span>
                      <span className="text-[12px] text-slate-300 font-mono">
                        {req.student?.rollNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-slate-400 flex-wrap">
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
                  {req.status === 'pending' && (
                    <div
                      className={`flex items-center gap-1.5 transition-all duration-150 ${
                        hoveredId === req.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <button
                        onClick={e => handleApprove(req.id, e)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors border border-emerald-200/60"
                        title="Approve"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={e => handleReject(req.id, e)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200/60"
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
