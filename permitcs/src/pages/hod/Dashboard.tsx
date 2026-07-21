import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const STATUS_TABS = [
  { label: 'All',      value: 'all'      },
  { label: 'Pending',  value: 'pending'  },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
] as const;

type TabValue = 'all' | 'pending' | 'approved' | 'rejected';

const tabActiveClass: Record<TabValue, string> = {
  all:      'bg-maroon-500 text-white',
  pending:  'bg-amber-500 text-white',
  approved: 'bg-emerald-500 text-white',
  rejected: 'bg-rose-500 text-white',
};

const borderByStatus: Record<string, string> = {
  pending:  'border-l-amber-400',
  approved: 'border-l-emerald-400',
  rejected: 'border-l-rose-400',
};

export default function HODDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch]     = useState('');
  const [department, setDept]   = useState('');
  const [tab, setTab]           = useState<TabValue>('all');

  const filtered = mockRequests.filter(req => {
    const matchesTab    = tab === 'all' || req.status === tab;
    const matchesSearch =
      req.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      req.faculty?.name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    return matchesTab && matchesSearch && matchesDept;
  });

  const counts = {
    total:    mockRequests.length,
    pending:  mockRequests.filter(r => r.status === 'pending').length,
    approved: mockRequests.filter(r => r.status === 'approved').length,
    rejected: mockRequests.filter(r => r.status === 'rejected').length,
  };

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <p className="text-[12px] font-bold text-maroon-500 uppercase tracking-widest mb-1">
              HOD Overview
            </p>
            <h1 className="text-[28px] font-heading font-bold text-slate-900">Department Dashboard</h1>
            <p className="text-[14px] text-slate-400 mt-1">
              {user?.department} · All requests across faculty
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Avatar name={user?.name || 'H'} size="md" role="hod" />
            <div>
              <p className="text-[14px] font-semibold text-slate-800">{user?.name}</p>
              <p className="text-[12px] text-slate-400">Head of Department</p>
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {[
            { icon: ClipboardList, label: 'Total',    value: counts.total,    grad: 'from-maroon-500 to-maroon-600', text: 'text-maroon-600' },
            { icon: Clock,         label: 'Pending',  value: counts.pending,  grad: 'from-amber-500 to-amber-600',  text: 'text-amber-600' },
            { icon: CheckCircle2,  label: 'Approved', value: counts.approved, grad: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600' },
            { icon: XCircle,       label: 'Rejected', value: counts.rejected, grad: 'from-rose-500 to-rose-600',    text: 'text-rose-600' },
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

        {/* ── Faculty at a Glance ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-[16px] font-heading font-bold text-slate-900 mb-3">Faculty at a Glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {mockFaculty.map(fac => {
              const facRequests = mockRequests.filter(r => r.facultyId === fac.id);
              const facPending  = facRequests.filter(r => r.status === 'pending').length;
              const pct         = facRequests.length > 0 ? Math.round((facPending / facRequests.length) * 100) : 0;
              return (
                <div key={fac.id} className="card px-4 py-3.5 flex items-center gap-3">
                  <Avatar name={fac.name} size="sm" role="faculty" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{fac.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Mini progress bar */}
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {facPending} pending
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Filters ── */}
        <div className="mb-4">
          <h2 className="text-[16px] font-heading font-bold text-slate-900 mb-3">All Requests</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search student, reason, or faculty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/12 transition-all shadow-subtle"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <select
                value={department}
                onChange={e => setDept(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-maroon-500 appearance-none cursor-pointer text-slate-700 min-w-[160px] shadow-subtle"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Status pill tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-150 ${
                  tab === t.value
                    ? tabActiveClass[t.value] + ' shadow-subtle'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-maroon-300 hover:text-maroon-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setDept(''); setTab('all'); }}>
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
                className={`card card-hover px-5 py-4 flex items-center justify-between cursor-pointer group border-l-4 ${borderByStatus[req.status]}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={req.student?.name || 'S'} size="sm" role="student" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[15px] font-semibold text-slate-800">{req.student?.name}</span>
                      <span className="text-[12px] text-slate-300 font-mono">{req.student?.rollNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-slate-400 flex-wrap">
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
