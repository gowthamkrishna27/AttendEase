import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Download, Search, X, Filter,
  Table2, FileText, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { AttendanceRequest } from '../../types';

interface ExcelSheetViewerModalProps {
  open: boolean;
  onClose: () => void;
  requests: AttendanceRequest[];
  title?: string;
  role?: 'hod' | 'faculty';
}

export function ExcelSheetViewerModal({
  open,
  onClose,
  requests = [],
  title = 'Attendance Permission Report',
  role = 'hod',
}: ExcelSheetViewerModalProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered rows
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const sName = (r.student?.name || r.studentName || '').toLowerCase();
      const sRoll = (r.student?.rollNumber || r.rollNumber || '').toLowerCase();
      const sDept = (r.student?.department || r.department || '').toLowerCase();
      const reason = (r.reasonLabel || r.reason || '').toLowerCase();
      const fName = (r.faculty?.name || r.facultyName || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || sName.includes(q) || sRoll.includes(q) || sDept.includes(q) || reason.includes(q) || fName.includes(q) || id.includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  // Statistics
  const totalCount = requests.length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // Format data for export
  const prepareExportData = (list: AttendanceRequest[]) => {
    return list.map((r, idx) => ({
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
  };

  // Export to authentic .xlsx file
  const handleExportXLSX = (filter: string = statusFilter) => {
    const list = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const data = prepareExportData(list);

    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    const colWidths = [
      { wch: 5 },  // #
      { wch: 15 }, // ID
      { wch: 22 }, // Student Name
      { wch: 14 }, // Roll Number
      { wch: 16 }, // Department
      { wch: 10 }, // Semester
      { wch: 18 }, // Reason
      { wch: 12 }, // Date
      { wch: 12 }, // End Date
      { wch: 20 }, // Periods / Time
      { wch: 12 }, // Status
      { wch: 22 }, // Assigned Faculty
      { wch: 26 }, // Faculty Email
      { wch: 30 }, // Description
      { wch: 14 }, // Submitted Date
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Requests");

    // Add Summary Sheet
    const summaryData = [
      { Metric: 'Total Requests', Count: totalCount, Percentage: '100%' },
      { Metric: 'Approved Requests', Count: approvedCount, Percentage: totalCount ? `${Math.round((approvedCount / totalCount) * 100)}%` : '0%' },
      { Metric: 'Pending Requests', Count: pendingCount, Percentage: totalCount ? `${Math.round((pendingCount / totalCount) * 100)}%` : '0%' },
      { Metric: 'Rejected Requests', Count: rejectedCount, Percentage: totalCount ? `${Math.round((rejectedCount / totalCount) * 100)}%` : '0%' },
      { Metric: 'Export Timestamp', Count: new Date().toLocaleString(), Percentage: '' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 24 }, { wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Overview");

    const filePrefix = role === 'hod' ? 'AttendEase_HOD_Report' : 'AttendEase_Faculty_Report';
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filePrefix}_${filter.toUpperCase()}_${dateStr}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = (filter: string = statusFilter) => {
    const list = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const data = prepareExportData(list);
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AttendEase_Report_${filter.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-orange-950/20 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 247, 237, 0.92) 100%)',
            backdropFilter: 'blur(24px) saturate(190%)',
            WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(254, 215, 170, 0.85)',
            boxShadow: '0 24px 60px -10px rgba(249, 115, 22, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          }}
          className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden text-slate-900"
        >
          {/* ── Top Bar: Glassy Orange Header ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(254, 215, 170, 0.50) 100%)',
              borderBottom: '1px solid rgba(254, 215, 170, 0.75)',
            }}
            className="px-5 py-3.5 flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.35)',
                  color: '#EA580C',
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              >
                <FileSpreadsheet size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-extrabold tracking-tight truncate flex items-center gap-2 text-slate-900">
                  <span>{title}</span>
                  <span
                    style={{
                      background: 'rgba(249, 115, 22, 0.12)',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      color: '#EA580C',
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  >
                    EXCEL VIEW
                  </span>
                </h2>
                <p className="text-[11.5px] text-orange-950/70 truncate">
                  {filtered.length} rows displayed • {totalCount} total entries in database
                </p>
              </div>
            </div>

            {/* Action Buttons: Glassy Orange */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportXLSX()}
                style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 1) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                }}
                className="px-3.5 py-1.5 text-white text-[12.5px] font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
                title="Download Microsoft Excel Workbook (.xlsx)"
              >
                <Download size={13} />
                <span>Export .XLSX</span>
              </button>
              <button
                onClick={() => handleExportCSV()}
                style={{
                  background: 'rgba(255, 247, 237, 0.9)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(254, 215, 170, 0.8)',
                  color: '#EA580C',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EA580C';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 247, 237, 0.9)';
                  e.currentTarget.style.color = '#EA580C';
                }}
                className="px-3 py-1.5 text-[12px] font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download CSV"
              >
                <FileText size={13} />
                <span>CSV</span>
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 247, 237, 0.9)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(254, 215, 170, 0.8)',
                  color: '#EA580C',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EA580C';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 247, 237, 0.9)';
                  e.currentTarget.style.color = '#EA580C';
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-sm font-bold ml-1 shadow-xs"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Toolbar / Filter Ribbon: Glassy Orange ── */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(254, 215, 170, 0.6)',
            }}
            className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-[12.5px]"
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                <input
                  type="text"
                  placeholder="Search student, roll number, department, reason..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(254, 215, 170, 0.8)',
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-[12.5px] rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(254, 215, 170, 0.8)',
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-2xs"
              >
                <Filter size={13} className="text-orange-500" />
                <span className="text-[11.5px] font-semibold text-slate-500">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-[12px] font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">All Records ({totalCount})</option>
                  <option value="approved">Approved ({approvedCount})</option>
                  <option value="pending">Pending ({pendingCount})</option>
                  <option value="rejected">Rejected ({rejectedCount})</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Excel Grid Table: Glassy Orange Spreadsheet ── */}
          <div className="flex-1 overflow-auto bg-orange-950/5 p-2.5">
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(254, 215, 170, 0.75)',
              }}
              className="rounded-xl shadow-xs overflow-x-auto min-w-full"
            >
              <table className="w-full border-collapse text-[12px]">
                {/* Column Letters Row (A, B, C...) */}
                <thead>
                  <tr
                    style={{
                      background: 'rgba(255, 247, 237, 0.85)',
                      borderBottom: '1px solid rgba(254, 215, 170, 0.65)',
                    }}
                    className="text-orange-950/70 font-mono text-[10px]"
                  >
                    <th className="w-10 px-2 py-1 text-center border-r border-orange-200/70 bg-orange-100/50">#</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">A (ID)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">B (STUDENT)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">C (ROLL NO)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">D (DEPT / SEM)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">E (REASON)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">F (DATE)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">G (PERIOD / TIME)</th>
                    <th className="px-3 py-1 text-center border-r border-orange-200/70">H (STATUS)</th>
                    <th className="px-3 py-1 text-left border-r border-orange-200/70">I (FACULTY)</th>
                    <th className="px-3 py-1 text-left">J (DETAILS)</th>
                  </tr>
                  {/* Column Title Header */}
                  <tr
                    style={{
                      background: 'rgba(255, 247, 237, 0.95)',
                      borderBottom: '2px solid rgba(254, 215, 170, 0.9)',
                    }}
                    className="text-slate-900 font-extrabold text-[11.5px]"
                  >
                    <th className="px-2 py-2 text-center border-r border-orange-200/70 bg-orange-100/70 text-orange-950 font-mono">Row</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Request ID</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Student Name</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Roll Number</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Dept · Sem</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Reason</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Date</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Time / Period</th>
                    <th className="px-3 py-2 text-center border-r border-orange-200/70">Status</th>
                    <th className="px-3 py-2 text-left border-r border-orange-200/70">Assigned Faculty</th>
                    <th className="px-3 py-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100/80">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet size={32} className="mx-auto text-orange-300 mb-2" />
                        <p className="font-bold text-slate-800 text-[13px]">No matching records found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try clearing search or selecting "All Statuses"</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr
                        key={r.id || i}
                        className="hover:bg-orange-50/60 transition-colors"
                      >
                        {/* Row Index */}
                        <td className="px-2 py-2 text-center font-mono text-[11px] text-orange-800/70 border-r border-orange-100 bg-orange-50/40 select-none">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700 border-r border-orange-100 whitespace-nowrap">
                          {r.id ? r.id.substring(0, 8) : `REQ-${1000 + i}`}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-orange-100 whitespace-nowrap">
                          {r.student?.name || r.studentName || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11.5px] text-slate-800 font-bold border-r border-orange-100 whitespace-nowrap">
                          {r.student?.rollNumber || r.rollNumber || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700 border-r border-orange-100 whitespace-nowrap">
                          {r.student?.department || r.department || 'CSD'} · {r.student?.semester || r.semester || '6'}th Sem
                        </td>
                        <td className="px-3 py-2 text-slate-900 font-medium border-r border-orange-100 whitespace-nowrap">
                          {r.reasonLabel || r.reason}
                        </td>
                        <td className="px-3 py-2 text-slate-800 border-r border-orange-100 whitespace-nowrap font-mono text-[11.5px]">
                          {r.date}
                        </td>
                        <td className="px-3 py-2 text-slate-700 border-r border-orange-100 whitespace-nowrap font-mono text-[11.5px]">
                          {r.periods ? `P: ${r.periods}` : `${r.startTime || ''} - ${r.endTime || ''}`}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-orange-100 whitespace-nowrap">
                          <span
                            style={{
                              background: r.status === 'approved'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : r.status === 'rejected'
                                ? 'rgba(244, 63, 94, 0.10)'
                                : 'rgba(249, 115, 22, 0.12)',
                              border: r.status === 'approved'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : r.status === 'rejected'
                                ? '1px solid rgba(244, 63, 94, 0.25)'
                                : '1px solid rgba(249, 115, 22, 0.3)',
                              color: r.status === 'approved'
                                ? '#047857'
                                : r.status === 'rejected'
                                ? '#E11D48'
                                : '#EA580C',
                            }}
                            className="inline-block px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider"
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-800 border-r border-orange-100 whitespace-nowrap font-medium">
                          {r.faculty?.name || r.facultyName || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={r.description}>
                          {r.description || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Bottom Sheet Tabs & Status Bar: Glassy Orange ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(254, 215, 170, 0.50) 100%)',
              borderTop: '1px solid rgba(254, 215, 170, 0.75)',
            }}
            className="px-4 py-2 flex items-center justify-between text-[11.5px] text-orange-950 shrink-0"
          >
            {/* Sheet Tabs */}
            <div className="flex items-center gap-1">
              <div
                style={{
                  background: '#ffffff',
                  borderTop: '2px solid #EA580C',
                  color: '#EA580C',
                }}
                className="px-3 py-1 rounded-t-lg font-bold text-[11.5px] flex items-center gap-1.5 shadow-xs"
              >
                <Table2 size={13} className="text-orange-600" />
                <span>Sheet 1: Requests</span>
              </div>
            </div>

            {/* Formula Status Counters */}
            <div className="flex items-center gap-4 text-orange-950/80 font-mono text-[11px]">
              <span>TOTAL ROWS: <strong className="text-orange-950 font-bold">{filtered.length}</strong> {filtered.length !== totalCount && <span className="text-orange-700/70">(filtered from {totalCount})</span>}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
