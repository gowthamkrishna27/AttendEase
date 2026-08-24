import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, Paperclip, CheckCheck,
  CheckCircle2, AlertCircle, Check, Loader2, X
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatDate, formatSubmittedAt, DEPARTMENTS } from '../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const itemVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

type TabValue = 'all' | 'pending' | 'approved' | 'rejected';

export default function FacultyRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch]         = useState('');
  const [department, setDept]       = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [tab, setTab]               = useState<TabValue>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg]     = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    refetchInterval: 5000,
  });

  const filtered = requestsList.filter((req: AttendanceRequest) => {
    const matchesTab    = tab === 'all' || req.status === tab;
    const matchesSearch =
      (req.student?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (req.reasonLabel ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (req.student?.rollNumber ?? req.studentId ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    const studentYear = req.student?.year || (req.student?.semester ? `${Math.ceil(req.student.semester / 2)}${Math.ceil(req.student.semester / 2) === 1 ? 'st' : Math.ceil(req.student.semester / 2) === 2 ? 'nd' : Math.ceil(req.student.semester / 2) === 3 ? 'rd' : 'th'} Year` : '');
    const matchesYear = !yearFilter || studentYear === yearFilter;
    return matchesTab && matchesSearch && matchesDept && matchesYear;
  });

  const pendingFiltered = filtered.filter(r => r.status === 'pending');
  const allPendingSelected = pendingFiltered.length > 0 && pendingFiltered.every(r => selectedIds.has(r.id));

  const toggleSelect = (id: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map(r => r.id)));
    }
  };

  // Bulk Accept Mutation
  const bulkAcceptMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkReviewRequests(ids, 'approve'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      setSelectedIds(new Set());
      showToast(`Successfully approved ${data.count} request(s)!`);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to approve requests', true);
    },
  });

  // Bulk Reject Mutation
  const bulkRejectMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkReviewRequests(ids, 'reject', 'Rejected by Faculty (Bulk)'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      setSelectedIds(new Set());
      showToast(`Rejected ${data.count} request(s).`, true);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to reject requests', true);
    },
  });

  // Single Quick Accept Mutation
  const quickAcceptMutation = useMutation({
    mutationFn: (id: string) => api.reviewRequest(id, 'approve'),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
      showToast(`Approved request for ${updated.student?.name || 'student'}!`);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to approve request', true);
    },
  });

  // Single Quick Reject Mutation
  const quickRejectMutation = useMutation({
    mutationFn: (id: string) => api.reviewRequest(id, 'reject', 'Rejected by Faculty'),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
      showToast(`Rejected request for ${updated.student?.name || 'student'}.`, true);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to reject request', true);
    },
  });

  const handleBulkAccept = () => {
    if (selectedIds.size === 0) return;
    bulkAcceptMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    bulkRejectMutation.mutate(Array.from(selectedIds));
  };

  const getDays = (_req: AttendanceRequest) => 1;

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-4xl mx-auto pb-24">

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-white text-[13px] font-bold ${
                toastMsg.isError ? 'bg-rose-600' : 'bg-orange-500 shadow-orange-500/20'
              }`}
            >
              {toastMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{toastMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Faculty</p>
            <h1 className="text-[26px] font-heading font-bold text-slate-900">Requests</h1>
            <p className="text-[14px] text-slate-400 mt-1">Review and action student attendance permission requests</p>
          </div>

          {/* Quick Select All Pending button if pending requests exist */}
          {pendingFiltered.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllPending}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                allPendingSelected
                  ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-subtle'
              }`}
            >
              <CheckCheck size={15} className={allPendingSelected ? 'text-orange-600' : 'text-slate-400'} />
              <span>{allPendingSelected ? 'Deselect All Pending' : `Select All Pending (${pendingFiltered.length})`}</span>
            </button>
          )}
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <select
                  value={department}
                  onChange={e => setDept(e.target.value)}
                  className="w-full sm:w-auto h-[42px] pl-9 pr-4 text-[13px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 appearance-none cursor-pointer text-slate-700 min-w-[140px] shadow-subtle font-medium"
                >
                  <option value="">All Branches</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="w-full sm:w-auto h-[42px] px-3 text-[13px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer text-slate-700 shadow-subtle font-medium"
              >
                <option value="">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>

              <select
                value={tab}
                onChange={e => setTab(e.target.value as TabValue)}
                className="w-full sm:w-auto h-[42px] px-3 text-[13px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer text-slate-700 shadow-subtle font-medium"
              >
                <option value="all">All Statuses ({requestsList.length})</option>
                <option value="pending">Pending ({requestsList.filter(r => r.status === 'pending').length})</option>
                <option value="approved">Approved ({requestsList.filter(r => r.status === 'approved').length})</option>
                <option value="rejected">Rejected ({requestsList.filter(r => r.status === 'rejected').length})</option>
              </select>
            </div>
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
                      <th className="w-10 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={allPendingSelected && pendingFiltered.length > 0}
                          onChange={toggleSelectAllPending}
                          disabled={pendingFiltered.length === 0}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                          title={allPendingSelected ? 'Deselect all pending' : 'Select all pending'}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Roll No.</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Branch / Year</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Proof Attached</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested On</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Days</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={listVariants} initial="hidden" animate="visible">
                    {filtered.map(req => {
                      const proofDocName = req.documentName || null;
                      const isSelected = selectedIds.has(req.id);
                      const isPending = req.status === 'pending';

                      return (
                        <motion.tr
                          key={req.id}
                          variants={itemVariants}
                          onClick={() => {
                            if (selectedIds.size > 0) {
                              toggleSelect(req.id);
                            } else {
                              navigate(`/faculty/request/${req.id}`);
                            }
                          }}
                          className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50/60 hover:bg-orange-50/80' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td
                            className="w-10 px-4 py-3.5 text-center"
                            onClick={e => {
                              e.stopPropagation();
                              toggleSelect(req.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 pointer-events-none"
                            />
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={req.student?.name || 'S'} src={req.student?.avatarUrl} size="sm" role="student" />
                              <span className="text-[13px] font-semibold text-slate-800">{req.student?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-mono text-slate-500">{req.student?.rollNumber}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                                {req.student?.department || 'CSD'}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {req.student?.year || (req.student?.semester ? `${Math.ceil(req.student.semester / 2)}${Math.ceil(req.student.semester / 2) === 1 ? 'st' : Math.ceil(req.student.semester / 2) === 2 ? 'nd' : Math.ceil(req.student.semester / 2) === 3 ? 'rd' : 'th'} Yr` : '3rd Yr')}
                              </span>
                            </div>
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
                            {req.submittedAt && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Sub: {formatSubmittedAt(req.submittedAt)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-medium text-slate-700">{getDays(req)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                          </td>

                          {/* Quick Row Actions (Thick Mark & Wrong Mark in Transparent Orange Theme) */}
                          <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={quickAcceptMutation.isPending}
                                  onClick={() => quickAcceptMutation.mutate(req.id)}
                                  title="Accept Request"
                                  className="w-7 h-7 bg-orange-500/15 hover:bg-orange-500 active:scale-90 text-orange-600 hover:text-white border border-orange-400/40 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                >
                                  <Check size={14} className="stroke-[3.5]" />
                                </button>
                                <button
                                  type="button"
                                  disabled={quickRejectMutation.isPending}
                                  onClick={() => quickRejectMutation.mutate(req.id)}
                                  title="Reject Request"
                                  className="w-7 h-7 bg-rose-500/15 hover:bg-rose-500 active:scale-90 text-rose-600 hover:text-white border border-rose-400/40 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                >
                                  <X size={14} className="stroke-[3.5]" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {/* Mobile Bulk Select Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-orange-50/60 border-b border-orange-100/80 text-xs font-bold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allPendingSelected && pendingFiltered.length > 0}
                      onChange={toggleSelectAllPending}
                      disabled={pendingFiltered.length === 0}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                    />
                    <span>Select All Pending ({pendingFiltered.length})</span>
                  </label>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-orange-600 font-extrabold hover:text-orange-700 active:underline text-[11.5px]"
                    >
                      Clear ({selectedIds.size})
                    </button>
                  )}
                </div>

                <motion.div variants={listVariants} initial="hidden" animate="visible">
                  {filtered.map(req => {
                    const proofDocName = req.documentName || null;
                    const isSelected = selectedIds.has(req.id);
                    const isPending = req.status === 'pending';

                    return (
                      <motion.div
                        key={req.id}
                        variants={itemVariants}
                        onClick={() => {
                          if (selectedIds.size > 0) {
                            toggleSelect(req.id);
                          } else {
                            navigate(`/faculty/request/${req.id}`);
                          }
                        }}
                        className={`p-3.5 cursor-pointer transition-all flex flex-col gap-2.5 ${
                          isSelected
                            ? 'bg-orange-50/90 ring-1 ring-orange-300'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Name, Roll No & Actions Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                toggleSelect(req.id);
                              }}
                              className="p-2 -m-2 flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 pointer-events-none"
                              />
                            </div>
                            <Avatar name={req.student?.name || 'S'} src={req.student?.avatarUrl} size="sm" role="student" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-bold text-slate-800 leading-tight truncate">{req.student?.name}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{req.student?.rollNumber}</p>
                            </div>
                          </div>

                          {/* Right Side: Simple Transparent Orange Rounded Thick Mark and Wrong Mark or Status Badge */}
                          <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {isPending ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={quickAcceptMutation.isPending}
                                  onClick={() => quickAcceptMutation.mutate(req.id)}
                                  className="w-8 h-8 bg-orange-500/15 hover:bg-orange-500 active:scale-90 text-orange-600 hover:text-white border border-orange-400/40 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                  title="Accept Request"
                                >
                                  <Check size={16} className="stroke-[3.5]" />
                                </button>
                                <button
                                  type="button"
                                  disabled={quickRejectMutation.isPending}
                                  onClick={() => quickRejectMutation.mutate(req.id)}
                                  className="w-8 h-8 bg-rose-500/15 hover:bg-rose-500 active:scale-90 text-rose-600 hover:text-white border border-rose-400/40 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                  title="Reject Request"
                                >
                                  <X size={16} className="stroke-[3.5]" />
                                </button>
                              </div>
                            ) : (
                              <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                            )}
                          </div>
                        </div>

                        {/* Reason, Days & Proof Row */}
                        <div className="flex items-center justify-between text-[11.5px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">{req.reasonLabel}</span>
                            {proofDocName && (
                              <span className="flex items-center gap-1 text-[9.5px] font-bold text-orange-600 bg-orange-100/70 px-1.5 py-0.5 rounded-md shrink-0">
                                <Paperclip size={9} />
                                Proof
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 shrink-0 text-[11px]">
                            <span>{formatDate(req.date)}</span>
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

        {/* ── Minimal Floating Batch Action Pill (White & Transparent Orange Theme) ── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <div className="fixed bottom-20 sm:bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.96 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(254, 215, 170, 0.85)',
                  boxShadow: '0 20px 40px -12px rgba(249, 115, 22, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
                }}
                className="pointer-events-auto pl-3.5 pr-2 py-1.5 rounded-full flex items-center gap-2.5 shadow-2xl"
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <span className="text-xs font-black text-slate-800 tracking-tight whitespace-nowrap">
                    {selectedIds.size} Selected
                  </span>
                </div>

                <div className="h-4 w-px bg-orange-200/80 shrink-0" />

                <div className="flex items-center gap-2">
                  {/* Simple Transparent Orange Thick Check Mark Rounded (Multiple Accept) */}
                  <button
                    type="button"
                    disabled={bulkAcceptMutation.isPending || bulkRejectMutation.isPending}
                    onClick={handleBulkAccept}
                    className="w-8 h-8 rounded-full bg-orange-500/15 hover:bg-orange-500 active:scale-90 text-orange-600 hover:text-white border border-orange-400/40 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
                    title={`Accept all ${selectedIds.size} selected requests`}
                  >
                    {bulkAcceptMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={16} className="stroke-[3.5]" />
                    )}
                  </button>

                  {/* Simple Transparent Wrong Mark Rounded (Multiple Reject) */}
                  <button
                    type="button"
                    disabled={bulkAcceptMutation.isPending || bulkRejectMutation.isPending}
                    onClick={handleBulkReject}
                    className="w-8 h-8 rounded-full bg-rose-500/15 hover:bg-rose-500 active:scale-90 text-rose-600 hover:text-white border border-rose-400/40 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
                    title={`Reject all ${selectedIds.size} selected requests`}
                  >
                    {bulkRejectMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={16} className="stroke-[3.5]" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="w-6 h-6 rounded-full bg-orange-50/80 hover:bg-orange-100/90 text-orange-600/80 hover:text-orange-700 flex items-center justify-center transition-colors cursor-pointer border border-orange-200/50 shrink-0 ml-0.5"
                  title="Clear selection"
                >
                  <X size={13} className="stroke-[2.5]" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
