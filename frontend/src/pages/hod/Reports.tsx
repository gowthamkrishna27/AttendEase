import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, CheckCircle2, Clock, XCircle, BarChart2, Eye, Table2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { ExcelSheetViewerModal } from '../../components/shared/ExcelSheetViewerModal';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
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
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

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

  /* Excel (.xlsx) Download Handler */
  const downloadExcel = (statusFilter: string = 'all') => {
    const list = statusFilter === 'all'
      ? requestsList
      : requestsList.filter((r: AttendanceRequest) => r.status === statusFilter);

    const rows = list.map((r: AttendanceRequest, idx: number) => ({
      '#': idx + 1,
      'Request ID': r.id || '',
      'Student Name': r.student?.name || r.studentName || '—',
      'Roll Number': r.student?.rollNumber || r.rollNumber || '—',
      'Department': r.student?.department || r.department || '—',
      'Semester': r.student?.semester || r.semester || '—',
      'Reason': r.reasonLabel || r.reason || '—',
      'Date': r.date || '—',
      'End Date': r.endDate || r.date || '—',
      'Periods / Time': r.periods ? `Periods: ${r.periods}` : `${r.startTime || ''} - ${r.endTime || ''}`,
      'Status': (r.status || 'pending').toUpperCase(),
      'Assigned Faculty': r.faculty?.name || r.facultyName || '—',
      'Faculty Email': r.faculty?.email || '—',
      'Description': r.description || '—',
      'Submitted Date': r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 22 }, { wch: 14 }, { wch: 16 },
      { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      { wch: 12 }, { wch: 22 }, { wch: 26 }, { wch: 30 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Requests");

    // Summary sheet
    const summaryData = [
      { Metric: 'Total Requests', Count: total, Percentage: '100%' },
      { Metric: 'Approved Requests', Count: approved, Percentage: total ? `${approvalRate}%` : '0%' },
      { Metric: 'Pending Requests', Count: pending, Percentage: total ? `${pendingRate}%` : '0%' },
      { Metric: 'Rejected Requests', Count: rejected, Percentage: total ? `${rejectedRate}%` : '0%' },
      { Metric: 'Export Timestamp', Count: new Date().toLocaleString(), Percentage: '' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Overview");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `AttendEase_HOD_Report_${statusFilter.toUpperCase()}_${dateStr}.xlsx`);
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
          <p className="text-[14px] text-slate-400 mt-1">Department-wide attendance permission analytics &amp; live Excel spreadsheet reports</p>
        </motion.div>

        {/* ── Excel Sheet Interactive Hub & Download Generator ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
            border: '1px solid #FED7AA',
            borderRadius: 20,
            boxShadow: '0 4px 20px rgba(249,115,22,0.06)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={28} className="text-orange-500 flex-shrink-0" />
              <div>
                <h2 className="text-[17px] font-heading font-bold text-slate-900">
                  Attendance Reports Excel Hub
                </h2>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  View live interactive spreadsheet records or export formatted Microsoft Excel (.xlsx) workbooks
                </p>
              </div>
            </div>

            {/* Action Buttons: View Excel Sheet + Download Excel */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                style={{
                  height: 40,
                  padding: '0 16px',
                  background: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  color: '#EA580C',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EA580C';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#EA580C';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#FFF7ED';
                  e.currentTarget.style.color = '#EA580C';
                  e.currentTarget.style.borderColor = '#FED7AA';
                }}
                title="Open interactive spreadsheet viewer"
              >
                <Eye size={15} />
                <span>View Excel Sheet</span>
              </button>

              <button
                onClick={() => downloadExcel('all')}
                style={{
                  height: 40,
                  padding: '0 18px',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(249,115,22,0.38)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(249,115,22,0.25)'; }}
                title="Download complete department records as .xlsx"
              >
                <Download size={15} />
                <span>Download Excel (.xlsx)</span>
              </button>
            </div>
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
                { label: 'Approved', count: approved, pct: approvalRate, color: 'bg-orange-500' },
                { label: 'Pending',  count: pending,  pct: pendingRate,  color: 'bg-amber-500'   },
                { label: 'Rejected', count: rejected, pct: rejectedRate, color: 'bg-rose-500'    },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-700">{item.count} ({item.pct}%)</span>
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
                      <span className="font-bold text-slate-700">{count} ({pct}%)</span>
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
                      <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">{fac.total}</td>
                      <td className="px-4 py-3 text-[13px]">
                        <span className="font-medium text-slate-700">
                          {fac.pending} pending
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>

      {/* ── Live Interactive Excel Viewer Modal ── */}
      <ExcelSheetViewerModal
        open={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        requests={requestsList}
        title="Department Attendance Permission Master Spreadsheet"
        role="hod"
      />
    </PageWrapper>
  );
}
