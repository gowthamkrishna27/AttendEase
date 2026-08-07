import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, CheckCircle2, Clock, XCircle, BarChart2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest, Faculty } from '../../types';

const REASON_LABELS: Record<string, string> = {
  internship:       'Internship',
  medical:          'Medical Leave',
  sports:           'Sports Event',
  family_emergency: 'Family Emergency',
  competition:      'Competition',
};

export default function HODReports() {
  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  const { data: facultyList = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => api.getFaculty(),
  });

  const total    = requestsList.length;
  const pending  = requestsList.filter((r: AttendanceRequest) => r.status === 'pending').length;
  const approved = requestsList.filter((r: AttendanceRequest) => r.status === 'approved').length;
  const rejected = requestsList.filter((r: AttendanceRequest) => r.status === 'rejected').length;

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pendingRate  = total > 0 ? Math.round((pending  / total) * 100) : 0;
  const rejectedRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  /* Excel / CSV Download Handler */
  const downloadExcel = (statusFilter: string = 'all') => {
    const list = statusFilter === 'all'
      ? requestsList
      : requestsList.filter((r: AttendanceRequest) => r.status === statusFilter);

    const headers = [
      'Request ID',
      'Student Name',
      'Roll Number',
      'Department',
      'Semester',
      'Reason',
      'Date',
      'Start Time',
      'End Time',
      'Status',
      'Assigned Faculty',
      'Faculty Email'
    ];

    const rows = list.map((r: AttendanceRequest) => [
      `"${r.id || ''}"`,
      `"${r.student?.name || ''}"`,
      `"${r.student?.rollNumber || ''}"`,
      `"${r.student?.department || ''}"`,
      `"${r.student?.semester || ''}"`,
      `"${r.reasonLabel || r.reason || ''}"`,
      `"${r.date || ''}"`,
      `"${r.startTime || ''}"`,
      `"${r.endTime || ''}"`,
      `"${r.status ? r.status.toUpperCase() : ''}"`,
      `"${r.faculty?.name || ''}"`,
      `"${r.faculty?.email || ''}"`,
    ]);

    const csvString = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AttendEase_${statusFilter.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* Requests by reason */
  const reasonCounts: Record<string, number> = {};
  requestsList.forEach((r: AttendanceRequest) => {
    reasonCounts[r.reason] = (reasonCounts[r.reason] ?? 0) + 1;
  });
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  /* Requests per faculty */
  const facultyStats = facultyList.map((f: Faculty) => {
    const reqs = requestsList.filter((r: AttendanceRequest) => r.facultyId === f.id);
    return { name: f.name, total: reqs.length, pending: reqs.filter((r: AttendanceRequest) => r.status === 'pending').length };
  });

  const barColors = ['bg-orange-500', 'bg-amber-500', 'bg-slate-900', 'bg-slate-700', 'bg-orange-600'];

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">HOD</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Reports &amp; Exports</h1>
          <p className="text-[14px] text-slate-400 mt-1">Department-wide attendance permission analytics &amp; Excel spreadsheet downloads</p>
        </motion.div>

        {/* ── Excel Sheet Download Generator (Desktop only) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card p-6 mb-6 hidden sm:block"
          style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
            border: '1px solid #FED7AA',
            borderRadius: 20,
            boxShadow: '0 4px 20px rgba(249,115,22,0.06)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 className="text-[17px] font-heading font-bold text-slate-900">
                  Attendance Reports Excel Generator
                </h2>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Export complete department attendance permission spreadsheets with full student &amp; faculty records
                </p>
              </div>
            </div>

            <button
              onClick={() => downloadExcel('all')}
              className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Download size={16} />
              <span>Download Full Excel (.csv)</span>
            </button>
          </div>

          {/* Quick Filtered Export Buttons */}
          <div className="pt-4 border-t border-orange-100 flex flex-wrap gap-2 text-[12px]">
            <span className="text-slate-400 font-semibold flex items-center mr-1">Quick Exports:</span>
            <button
              onClick={() => downloadExcel('approved')}
              className="px-3.5 py-1.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 font-semibold rounded-lg border border-slate-200 hover:border-orange-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-subtle"
            >
              <CheckCircle2 size={13} className="text-orange-500" />
              <span>Approved Requests Excel</span>
            </button>
            <button
              onClick={() => downloadExcel('pending')}
              className="px-3.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold rounded-lg border border-slate-200 hover:border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-subtle"
            >
              <Clock size={13} className="text-amber-500" />
              <span>Pending Requests Excel</span>
            </button>
            <button
              onClick={() => downloadExcel('rejected')}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold rounded-lg border border-slate-200 hover:border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-subtle"
            >
              <XCircle size={13} className="text-rose-500" />
              <span>Rejected Requests Excel</span>
            </button>
          </div>
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
              {topReasons.map(([reasonKey, count], idx) => {
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
              })}
            </div>
          </motion.div>

        </div>

        {/* ── Faculty Performance Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[14px] font-heading font-bold text-slate-900">Faculty Request Volume</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Faculty Member</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Handled</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Load</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody>
                {facultyStats.map(fac => {
                  const share = total > 0 ? Math.round((fac.total / total) * 100) : 0;
                  return (
                    <tr key={fac.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-[13px] font-semibold text-slate-800">{fac.name}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-600">{fac.total}</td>
                      <td className="px-4 py-3 text-[13px]">
                        <span className={`font-semibold ${fac.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {fac.pending} pending
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500 font-medium">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
