import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Check, X } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatDate, DEPARTMENTS } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

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

export default function HODDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch]     = useState('');
  const [department, setDept]   = useState('');
  const [tab, setTab]           = useState<TabValue>('all');

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.reviewRequest(id, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });

  const handleApprove = (id: string) => {
    reviewMutation.mutate({ id, action: 'approve' });
  };

  const handleReject = (id: string) => {
    reviewMutation.mutate({ id, action: 'reject' });
  };

  const filtered = requestsList.filter((req: AttendanceRequest) => {
    const matchesTab    = tab === 'all' || req.status === tab;
    const matchesSearch =
      req.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      (req.student?.rollNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (req.faculty?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    return matchesTab && matchesSearch && matchesDept;
  });

  const getDays = (_req: AttendanceRequest) => 1;

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">

        {/* ── HOD Profile Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card overflow-hidden mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Photo */}
            <div className="sm:w-48 w-full h-52 sm:h-auto flex-shrink-0 bg-slate-100 overflow-hidden">
              <img
                src="https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg"
                alt="HOD Profile"
                className="w-full h-full object-cover object-top"
              />
            </div>
            {/* Info */}
            <div className="flex-1 p-5 sm:px-6 sm:py-5 flex flex-col justify-center">
              <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">
                HOD Overview
              </p>
              <p className="text-[20px] sm:text-[22px] font-heading font-bold text-slate-900 mb-0.5">{user?.name}</p>
              <p className="text-[13px] sm:text-[14px] text-slate-500 mb-3">Head of Department</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  {user?.department ?? 'Computer Science & Engineering'}
                </span>
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  SRKR Engineering College
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-slate-400 mt-2.5">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* ── All Requests ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="mb-8"
        >
          <h2 className="text-[16px] font-heading font-bold text-slate-900 mb-3">All Requests</h2>

          {/* Search + Department Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-3.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search by student, reason, or ID..."
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

          {/* Table / Mobile Cards */}
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
              
              {/* Desktop / Tablet View (Table) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ID / Roll No.</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested On</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Days</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={listVariants} initial="hidden" animate="visible">
                    {filtered.map(req => (
                      <motion.tr
                        key={req.id}
                        variants={itemVariants}
                        onClick={() => navigate(`/hod/request/${req.id}`)}
                        className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Student */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={req.student?.name || 'S'} size="sm" role="student" />
                            <span className="text-[13px] font-semibold text-slate-800">{req.student?.name}</span>
                          </div>
                        </td>
                        {/* ID / Roll No. */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-mono text-slate-500">{req.student?.rollNumber}</span>
                        </td>
                        {/* Reason */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-slate-600">{req.reasonLabel}</span>
                        </td>
                        {/* Requested On */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-slate-500">{formatDate(req.date)}</span>
                        </td>
                        {/* Days */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-medium text-slate-700">{getDays(req)}</span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <StatusBadge status={req.status} />
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              title="Approve"
                              onClick={() => handleApprove(req.id)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                              }`}
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              title="Reject"
                              onClick={() => handleReject(req.id)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${
                                req.status === 'rejected'
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500'
                              }`}
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
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
                          <Avatar name={req.student?.name || 'S'} size="sm" role="student" />
                          <div>
                            <p className="text-[14px] font-semibold text-slate-800 leading-tight">{req.student?.name}</p>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">{req.student?.rollNumber}</p>
                          </div>
                        </div>
                        <StatusBadge status={req.status} />
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

                      {/* Bottom Row: Actions */}
                      <div className="flex items-center justify-between pt-0.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] text-slate-400 font-medium">Quick Actions</span>
                        <div className="flex items-center gap-2">
                          <button
                            title="Approve"
                            onClick={() => handleApprove(req.id)}
                            className={`px-3 py-1 text-[12px] font-semibold rounded-lg border flex items-center gap-1 transition-all ${
                              req.status === 'approved'
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 active:bg-emerald-500 active:text-white'
                            }`}
                          >
                            <Check size={13} strokeWidth={2.5} />
                            <span>Approve</span>
                          </button>
                          <button
                            title="Reject"
                            onClick={() => handleReject(req.id)}
                            className={`px-3 py-1 text-[12px] font-semibold rounded-lg border flex items-center gap-1 transition-all ${
                              req.status === 'rejected'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : 'bg-rose-50 text-rose-600 border-rose-200 active:bg-rose-500 active:text-white'
                            }`}
                          >
                            <X size={13} strokeWidth={2.5} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* View All Requests footer */}
              <div className="flex items-center justify-center py-3.5 border-t border-slate-100 bg-slate-50/40">
                <button
                  onClick={() => navigate('/hod/requests')}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View All Requests
                  <span className="text-[15px]">→</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </PageWrapper>
  );
}
