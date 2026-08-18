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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-5 sm:mb-6"
        >
          <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
            ADMIN AUDIT
          </span>
          <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight mt-1">All Request Logs</h1>
          <p className="text-[13px] text-[#6b7280]">Audit log of all student attendance permission requests in the system</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#88929e]" />
            <input
              type="text"
              placeholder="Search by student, reason, or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 text-[13.5px] bg-[#edf0f2] text-[#18181b] placeholder:text-[#88929e] rounded-lg outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#88929e] pointer-events-none" />
              <select
                value={department}
                onChange={e => setDept(e.target.value)}
                className="w-full sm:w-auto h-[40px] pl-8 pr-8 text-[13px] bg-[#edf0f2] text-[#18181b] rounded-lg outline-none border border-transparent focus:border-slate-300 focus:bg-white appearance-none cursor-pointer min-w-[150px] font-medium transition-all"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {(search || department) && (
              <button
                onClick={() => { setSearch(''); setDept(''); }}
                className="h-[40px] px-3.5 bg-[#edf0f2] hover:bg-rose-50 text-rose-600 rounded-lg text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Requests Logs list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#88929e] gap-3">
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(24,24,27,0.15)', borderTopColor: '#18181b', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p className="text-[13px] font-medium">Loading request history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No request logs found"
            description="Try adjusting your filters."
            action={<Button variant="secondary" onClick={() => { setSearch(''); setDept(''); }}>Reset Filters</Button>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-[#f8f9fa]">
                    <th className="text-left px-5 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Roll No.</th>
                    <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Reason</th>
                    <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Assigned Faculty</th>
                    <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(req => (
                    <tr
                      key={req.id}
                      className="hover:bg-[#fafafa] transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={req.student?.name || 'S'} size="sm" role="student" />
                          <span className="text-[13.5px] font-semibold text-[#18181b]">{req.student?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] font-mono text-[#6b7280]">{req.student?.rollNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] text-[#374151]">{req.reasonLabel}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] text-[#6b7280]">{formatDate(req.date)}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] text-[#374151] font-medium">{req.faculty?.name || 'Not assigned'}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
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
