import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, FileText, Paperclip } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatDate, DEPARTMENTS } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

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
  all:      'bg-orange-500 text-white',
  pending:  'bg-amber-500 text-white',
  approved: 'bg-emerald-500 text-white',
  rejected: 'bg-rose-500 text-white',
};

export default function FacultyRequests() {
  const navigate = useNavigate();

  const [search, setSearch]   = useState('');
  const [department, setDept] = useState('');
  const [tab, setTab]         = useState<TabValue>('all');

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    refetchInterval: 5000,
  });

  const filtered = requestsList.filter((req: AttendanceRequest) => {
    const matchesTab    = tab === 'all' || req.status === tab;
    const matchesSearch =
      req.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      (req.student?.rollNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    return matchesTab && matchesSearch && matchesDept;
  });

  const getDays = (_req: AttendanceRequest) => 1;

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Faculty</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Requests</h1>
          <p className="text-[14px] text-slate-400 mt-1">Review and action student attendance permission requests</p>
        </motion.div>

        {/* ── Controls ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.07 }}
          className="mb-4"
        >
          {/* Search + Department Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-3.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search by student, reason, or roll no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] sm:text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/12 transition-all shadow-subtle"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <select
                value={department}
                onChange={e => setDept(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-4 py-2.5 text-[13px] sm:text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 appearance-none cursor-pointer text-slate-700 min-w-[160px] shadow-subtle"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Status pill tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 no-scrollbar">
            {STATUS_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3.5 sm:px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold rounded-full whitespace-nowrap transition-all duration-150 ${
                  tab === t.value
                    ? tabActiveClass[t.value] + ' shadow-subtle'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Requests List ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
        >
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
            <div className="card overflow-hidden">

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Roll No.</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Proof Attached</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested On</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Days</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={listVariants} initial="hidden" animate="visible">
                    {filtered.map(req => {
                      const proofDocName = req.documentName || (req.reason !== 'other' ? `${req.reason}_Proof.pdf` : null);
                      return (
                        <motion.tr
                          key={req.id}
                          variants={itemVariants}
                          onClick={() => navigate(`/faculty/request/${req.id}`)}
                          className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={req.student?.name || 'S'} src={req.student?.avatarUrl} size="sm" role="student" />
                              <span className="text-[13px] font-semibold text-slate-800">{req.student?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-mono text-slate-500">{req.student?.rollNumber}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] text-slate-600">{req.reasonLabel}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {proofDocName ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 bg-orange-50/90 hover:bg-orange-100 border border-orange-200/80 px-2.5 py-1 rounded-lg transition-colors w-fit">
                                <Paperclip size={12} className="text-orange-500 flex-shrink-0" />
                                <span className="truncate max-w-[130px]">{proofDocName}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-400 italic">No document</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] text-slate-500">{formatDate(req.date)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-medium text-slate-700">{getDays(req)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="block sm:hidden divide-y divide-slate-100">
                <motion.div variants={listVariants} initial="hidden" animate="visible">
                  {filtered.map(req => {
                    const proofDocName = req.documentName || (req.reason !== 'other' ? `${req.reason}_Proof.pdf` : null);
                    return (
                      <motion.div
                        key={req.id}
                        variants={itemVariants}
                        onClick={() => navigate(`/faculty/request/${req.id}`)}
                        className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors flex flex-col gap-2.5"
                      >
                        {/* Name & Roll No */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={req.student?.name || 'S'} src={req.student?.avatarUrl} size="sm" role="student" />
                            <div>
                              <p className="text-[14px] font-semibold text-slate-800 leading-tight">{req.student?.name}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{req.student?.rollNumber}</p>
                            </div>
                          </div>
                          <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                        </div>

                        {/* Reason & Proof */}
                        <div className="flex items-center justify-between text-[12px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">{req.reasonLabel}</span>
                            {proofDocName && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md">
                                <Paperclip size={10} />
                                Proof
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span>{formatDate(req.date)}</span>
                            <span>•</span>
                            <span>{getDays(req)} day</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

            </div>
          )}
        </motion.div>

      </div>
    </PageWrapper>
  );
}
