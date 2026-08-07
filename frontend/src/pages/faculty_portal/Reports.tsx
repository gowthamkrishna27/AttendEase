import { motion } from 'framer-motion';
import { ClipboardList, Clock, CheckCircle2, XCircle, BarChart2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

const REASON_LABELS: Record<string, string> = {
  internship:       'Internship',
  medical:          'Medical Leave',
  sports:           'Sports Event',
  family_emergency: 'Family Emergency',
  competition:      'Competition',
};

export default function FacultyReports() {
  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  const total    = requestsList.length;
  const pending  = requestsList.filter((r: AttendanceRequest) => r.status === 'pending').length;
  const approved = requestsList.filter((r: AttendanceRequest) => r.status === 'approved').length;
  const rejected = requestsList.filter((r: AttendanceRequest) => r.status === 'rejected').length;

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pendingRate  = total > 0 ? Math.round((pending  / total) * 100) : 0;
  const rejectedRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  /* Requests by reason */
  const reasonCounts: Record<string, number> = {};
  requestsList.forEach((r: AttendanceRequest) => {
    reasonCounts[r.reason] = (reasonCounts[r.reason] ?? 0) + 1;
  });
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  /* Requests per student */
  type StudentStat = { name: string; total: number; pending: number };
  const studentMap = new Map<string, StudentStat>();
  requestsList.forEach((r: AttendanceRequest) => {
    const sName = r.studentName || r.student?.name || 'Unknown Student';
    const existing = studentMap.get(sName);
    if (!existing) {
      studentMap.set(sName, {
        name: sName,
        total: 1,
        pending: r.status === 'pending' ? 1 : 0
      });
    } else {
      existing.total++;
      if (r.status === 'pending') {
        existing.pending++;
      }
    }
  });
  const studentStats = Array.from(studentMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8); // Top 8 students

  const barColors = ['bg-orange-500', 'bg-amber-500', 'bg-slate-900', 'bg-slate-700', 'bg-orange-600'];

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
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Reports &amp; Exports</h1>
          <p className="text-[14px] text-slate-400 mt-1">Attendance permission analytics &amp; statistics</p>
        </motion.div>

        {/* ── Summary stat cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          {[
            { icon: ClipboardList, label: 'Total Requests', value: total,    sub: 'All time',        grad: 'from-orange-500 to-orange-600', text: 'text-orange-600' },
            { icon: Clock,         label: 'Pending',         value: pending,  sub: `${pendingRate}% of total`,  grad: 'from-amber-500 to-amber-600',   text: 'text-amber-600'  },
            { icon: CheckCircle2,  label: 'Approved',        value: approved, sub: `${approvalRate}% approval`, grad: 'from-orange-500 to-orange-600',text: 'text-orange-600'},
            { icon: XCircle,       label: 'Rejected',        value: rejected, sub: `${rejectedRate}% of total`, grad: 'from-rose-500 to-rose-600',     text: 'text-rose-500'  },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card px-4 py-4 flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${s.grad}`}>
                  <Icon size={14} className="text-white" />
                </div>
                <div>
                  <p className={`text-[24px] font-heading font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-[12px] font-semibold text-slate-700">{s.label}</p>
                  <p className="text-[11px] text-slate-400">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          {/* ── Approval breakdown ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card px-5 py-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-orange-500" />
              <h2 className="text-[14px] font-heading font-bold text-slate-900">Status Breakdown</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Approved', count: approved, pct: approvalRate, color: 'bg-orange-500', text: 'text-orange-600' },
                { label: 'Pending',  count: pending,  pct: pendingRate,  color: 'bg-amber-500',   text: 'text-amber-600'   },
                { label: 'Rejected', count: rejected, pct: rejectedRate, color: 'bg-rose-500',    text: 'text-rose-500'    },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className={`font-bold ${item.text}`}>{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Top Reasons ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="card px-5 py-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-orange-500" />
              <h2 className="text-[14px] font-heading font-bold text-slate-900">Top Request Reasons</h2>
            </div>
            <div className="space-y-3">
              {topReasons.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-4">No request data found</p>
              ) : (
                topReasons.map(([reasonKey, count], idx) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const label = REASON_LABELS[reasonKey] ?? reasonKey;
                  return (
                    <div key={reasonKey}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="font-bold text-slate-600">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

        </div>

        {/* ── Student Request Volume ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[14px] font-heading font-bold text-slate-900">Student Request Volume</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Handled</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Load</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-center text-slate-400 text-[13px]">
                      No student request data available
                    </td>
                  </tr>
                ) : (
                  studentStats.map(stat => {
                    const share = total > 0 ? Math.round((stat.total / total) * 100) : 0;
                    return (
                      <tr key={stat.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-[13px] font-semibold text-slate-800">{stat.name}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{stat.total}</td>
                        <td className="px-4 py-3 text-[13px]">
                          <span className={`font-semibold ${stat.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {stat.pending} pending
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-500 font-medium">{share}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
