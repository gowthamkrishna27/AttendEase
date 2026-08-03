import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatDate, DEPARTMENTS } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

export default function AdminRequests() {
  const [search, setSearch]     = useState('');
  const [department, setDept]   = useState('');

  const { data: requestsList = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  const filtered = requestsList.filter((req: AttendanceRequest) => {
    const matchesSearch =
      (req.student?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      (req.student?.rollNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || req.student?.department === department;
    return matchesSearch && matchesDept;
  });

  return (
    <PageWrapper role="admin">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 sm:mb-6"
        >
          <p className="text-[11px] sm:text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Admin Audit</p>
          <h1 className="text-[22px] sm:text-[26px] font-heading font-bold text-slate-900">All Request Logs</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-400 mt-1">Audit log of all student attendance permission requests in the system</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search by student, reason, or roll number..."
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

            {(search || department) && (
              <button
                onClick={() => { setSearch(''); setDept(''); }}
                className="h-[42px] px-3.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-subtle cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Requests Logs list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.15)', borderTopColor: '#F97316', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p className="text-[13px] font-medium">Loading request history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No request logs found"
            description="Try adjusting your filters."
            action={<Button variant="secondary" onClick={() => { setSearch(''); setDept(''); }}>Reset Filters</Button>}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Roll No.</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Faculty</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(req => (
                    <tr
                      key={req.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={req.student?.name || 'S'} size="sm" role="student" />
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
                        <span className="text-[13px] text-slate-500">{formatDate(req.date)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-slate-600">{req.faculty?.name || 'Not assigned'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
