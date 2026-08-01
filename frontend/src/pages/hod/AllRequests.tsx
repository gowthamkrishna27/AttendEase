import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, RotateCcw, Check, X, Paperclip } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatDate, DEPARTMENTS } from '../../lib/utils';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function HODAllRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState('');
  const [department, setDept]   = useState('');
  const [tab, setTab]           = useState<TabValue>('all');

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    refetchInterval: 5000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      try {
        return await api.reviewRequest(id, action);
      } catch (err) {
        console.warn('API reviewRequest error, applying local optimistic override:', err);
        queryClient.setQueryData(['requests'], (old: any[] | undefined) =>
          old ? old.map(r => (r.id === id || r.requestId === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)) : []
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['public-approved-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['attendanceSubmissions'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
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
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 sm:mb-6"
        >
          <p className="text-[11px] sm:text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">HOD</p>
          <h1 className="text-[22px] sm:text-[26px] font-heading font-bold text-slate-900">All Requests</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-400 mt-1">Every attendance permission request across all faculty</p>
        </motion.div>

        {/* ── Filters ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="mb-4"
        >
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-3.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search by student, reason, or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-[42px] pl-9 pr-4 text-[13px] sm:text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/12 transition-all shadow-subtle"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <select
                  value={department}
                  onChange={e => setDept(e.target.value)}
                  className="w-full sm:w-auto h-[42px] pl-9 pr-8 text-[13px] sm:text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 appearance-none cursor-pointer text-slate-700 min-w-[150px] shadow-subtle font-medium"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {(search || department || tab !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setDept(''); setTab('all'); }}
                  className="h-[42px] px-3.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-subtle cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 mb-4 no-scrollbar">
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

        {/* ── Table / Mobile Cards ── */}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card overflow-hidden"
          >
            {/* Desktop / Tablet View (Table) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ID / Roll No.</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Proof Document</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Faculty</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested On</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action / Override</th>
                  </tr>
                </thead>
                <motion.tbody variants={listVariants} initial="hidden" animate="visible">
                  {filtered.map(req => {
                    const proofDocName = req.documentName || null;
                    return (
                      <motion.tr
                        key={req.id}
                        variants={itemVariants}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={req.student?.name || 'S'} src={req.student?.avatarUrl} size="sm" role="student" />
                            <span className="text-[13px] font-semibold text-slate-800">{req.student?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <span className="text-[13px] font-mono text-slate-500">{req.student?.rollNumber}</span>
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <span className="text-[13px] text-slate-600">{req.reasonLabel}</span>
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          {proofDocName ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 bg-orange-50/90 hover:bg-orange-100 border border-orange-200/80 px-2.5 py-1 rounded-lg transition-colors w-fit">
                              <Paperclip size={12} className="text-orange-500 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{proofDocName}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400 italic">No document</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <span className="text-[12px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 inline-block">
                            {req.faculty?.name || 'Department Faculty'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <span className="text-[13px] text-slate-500">{formatDate(req.date)}</span>
                        </td>
                        <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(`/hod/request/${req.id}`)}>
                          <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Approve / Force Approve Request"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => reviewMutation.mutate({ id: req.id, action: 'reject' })}
                              className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Reject / Force Reject Request"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile View (Card List) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              <motion.div variants={listVariants} initial="hidden" animate="visible">
                {filtered.map(req => (
                  <motion.div
                    key={req.id}
                    variants={itemVariants}
                    onClick={() => navigate(`/hod/request/${req.id}`)}
                    className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors flex flex-col gap-2.5"
                  >
                    {/* Top Row: Avatar, Name & Roll No */}
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

                    {/* Middle Row: Reason, Date & Duration */}
                    <div className="flex items-center justify-between text-[12px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-700">{req.reasonLabel}</span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{formatDate(req.date)}</span>
                        <span>•</span>
                        <span>{getDays(req)} days</span>
                      </div>
                    </div>

                    {/* Faculty Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Faculty:</span>
                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                        {req.faculty?.name || 'Department Faculty'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

      </div>
    </PageWrapper>
  );
}
