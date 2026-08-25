import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  BarChart2,
  Eye,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  X,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { ExcelSheetViewerModal } from '../../components/shared/ExcelSheetViewerModal';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

const REASON_METADATA: Record<string, { label: string; color: string; bg: string }> = {
  internship:          { label: 'Internship', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  startup:             { label: 'Startup & Innovation', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  project_development: { label: 'Project Development', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  medical:             { label: 'Medical Leave', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  sports:              { label: 'Sports & Athletics', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  competition:         { label: 'Hackathons & Competitions', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  family_emergency:    { label: 'Family Emergency', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  other:               { label: 'Other Exemptions', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
};

function formatReasonName(reasonKey: string, fallback?: string): string {
  if (REASON_METADATA[reasonKey]) return REASON_METADATA[reasonKey].label;
  if (fallback) return fallback;
  return reasonKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function FacultyReports() {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReasonTab, setSelectedReasonTab] = useState<string>('all');

  // Set of open/expanded reason group keys
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

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

  // Filtered requests based on global search & status
  const filteredRequests = useMemo(() => {
    return requestsList.filter(r => {
      const q = search.toLowerCase().trim();
      const sName = (r.student?.name || r.studentName || '').toLowerCase();
      const sRoll = (r.student?.rollNumber || r.rollNumber || '').toLowerCase();
      const sDept = (r.student?.department || r.department || '').toLowerCase();
      const reasonKey = (r.reason || '').toLowerCase();
      const reasonLabel = (r.reasonLabel || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();

      const matchesSearch =
        !q ||
        sName.includes(q) ||
        sRoll.includes(q) ||
        sDept.includes(q) ||
        reasonKey.includes(q) ||
        reasonLabel.includes(q) ||
        desc.includes(q);

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesReason = selectedReasonTab === 'all' || r.reason === selectedReasonTab;

      return matchesSearch && matchesStatus && matchesReason;
    });
  }, [requestsList, search, statusFilter, selectedReasonTab]);

  // Group filtered requests by Reason Category
  interface ReasonGroup {
    key: string;
    label: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    requests: AttendanceRequest[];
  }

  const groupedByReason = useMemo(() => {
    const groups: Record<string, ReasonGroup> = {};

    filteredRequests.forEach(r => {
      const key = r.reason || 'other';
      const label = formatReasonName(key, r.reasonLabel);

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          requests: [],
        };
      }

      groups[key].total++;
      if (r.status === 'approved') groups[key].approved++;
      else if (r.status === 'pending') groups[key].pending++;
      else if (r.status === 'rejected') groups[key].rejected++;

      groups[key].requests.push(r);
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [filteredRequests]);

  // Expand / Collapse Helpers
  const toggleReasonGroup = (key: string) => {
    setExpandedReasons(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const isGroupExpanded = (key: string) => {
    return expandedReasons[key] !== false; // Default open
  };

  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    groupedByReason.forEach(g => { allOpen[g.key] = true; });
    setExpandedReasons(allOpen);
  };

  const handleCollapseAll = () => {
    const allClosed: Record<string, boolean> = {};
    groupedByReason.forEach(g => { allClosed[g.key] = false; });
    setExpandedReasons(allClosed);
  };

  /* Multi-Sheet & Reason Excel Download Handler */
  const downloadGroupedExcel = (specificReasonKey?: string) => {
    const targetGroups = specificReasonKey
      ? groupedByReason.filter(g => g.key === specificReasonKey)
      : groupedByReason;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = [
      { Metric: 'Total Requests', Count: total, Rate: '100%' },
      { Metric: 'Approved Requests', Count: approved, Rate: `${approvalRate}%` },
      { Metric: 'Pending Requests', Count: pending, Rate: `${pendingRate}%` },
      { Metric: 'Rejected Requests', Count: rejected, Rate: `${rejectedRate}%` },
      { Metric: 'Export Timestamp', Count: new Date().toLocaleString(), Rate: '' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Create a separate sheet for each reason group
    targetGroups.forEach(group => {
      const sheetName = group.label.slice(0, 31).replace(/[/\\?*:[\]]/g, '');
      const rows = group.requests.map((r, idx) => ({
        '#': idx + 1,
        'Roll Number': r.student?.rollNumber || r.rollNumber || '—',
        'Student Name': r.student?.name || r.studentName || '—',
        'Department': r.student?.department || r.department || '—',
        'Semester': r.student?.semester || r.semester || '—',
        'Reason Category': group.label,
        'Date': r.date || '—',
        'End Date': r.endDate || r.date || '—',
        'Time / Periods': r.periods ? `Periods: ${r.periods}` : `${r.startTime || ''} - ${r.endTime || ''}`,
        'Status': (r.status || 'pending').toUpperCase(),
        'Description': r.description || '—',
        'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 },
        { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
        { wch: 30 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = specificReasonKey
      ? `AttendEase_Faculty_Report_${specificReasonKey}_${dateStr}.xlsx`
      : `AttendEase_Faculty_Grouped_Report_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
              FACULTY PORTAL
            </span>
            <span className="text-[11px] font-medium text-slate-400">Request Analytics</span>
          </div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight mt-1">Permission Reports by Reason</h1>
          <p className="text-[13px] text-slate-500">Grouped analysis and student requests categorized by permission reasons</p>
        </motion.div>

        {/* ── KPI Metrics Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11.5px] font-semibold text-slate-500">Total Requests</p>
            <p className="text-[22px] font-black text-slate-900 font-mono mt-1">{total}</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">{groupedByReason.length} categories</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11.5px] font-semibold text-emerald-700">Approved</p>
            <p className="text-[22px] font-black text-emerald-600 font-mono mt-1">{approved}</p>
            <p className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">{approvalRate}% rate</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11.5px] font-semibold text-amber-700">Pending Review</p>
            <p className="text-[22px] font-black text-amber-600 font-mono mt-1">{pending}</p>
            <p className="text-[10.5px] text-amber-600 font-semibold mt-0.5">{pendingRate}% pending</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11.5px] font-semibold text-rose-700">Rejected</p>
            <p className="text-[22px] font-black text-rose-600 font-mono mt-1">{rejected}</p>
            <p className="text-[10.5px] text-rose-600 font-semibold mt-0.5">{rejectedRate}% rate</p>
          </div>
        </div>

        {/* ── Action Hub & Search Toolbar ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or reason…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Filters & Export Controls */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {/* Reason Category Dropdown */}
              <select
                value={selectedReasonTab}
                onChange={e => setSelectedReasonTab(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-slate-500 cursor-pointer"
                title="Filter requests by reason category"
              >
                <option value="all">All Reasons ({total})</option>
                {Object.keys(REASON_METADATA).map(key => {
                  const count = requestsList.filter(r => r.reason === key).length;
                  return (
                    <option key={key} value={key}>
                      {REASON_METADATA[key].label} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-slate-500 cursor-pointer"
              >
                <option value="all">All Statuses ({total})</option>
                <option value="approved">Approved ({approved})</option>
                <option value="pending">Pending ({pending})</option>
                <option value="rejected">Rejected ({rejected})</option>
              </select>

              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye size={13} />
                <span>Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => downloadGroupedExcel()}
                className="px-3.5 py-1.5 bg-[#18181b] hover:bg-slate-800 text-white rounded-xl text-[12px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>Export Multi-Sheet Excel</span>
              </button>
            </div>
          </div>

          {/* Quick Category Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11.5px]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setSelectedReasonTab('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                  selectedReasonTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Reasons ({total})
              </button>

              {Object.keys(REASON_METADATA).map(key => {
                const count = requestsList.filter(r => r.reason === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedReasonTab(selectedReasonTab === key ? 'all' : key)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedReasonTab === key
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {REASON_METADATA[key].label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 shrink-0">
              <button
                type="button"
                onClick={handleExpandAll}
                className="hover:text-slate-900 cursor-pointer"
              >
                Expand All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="hover:text-slate-900 cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* ── Reason Grouped Request List ── */}
        <div className="space-y-4">
          {groupedByReason.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400 text-[13px] shadow-2xs">
              No permission requests found matching your current filter.
            </div>
          ) : (
            groupedByReason.map(group => {
              const isExpanded = isGroupExpanded(group.key);
              const meta = REASON_METADATA[group.key] || {
                label: group.label,
                color: 'text-slate-800',
                bg: 'bg-slate-50 border-slate-200',
              };

              return (
                <div
                  key={group.key}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all"
                >
                  {/* Group Header Bar */}
                  <div
                    onClick={() => toggleReasonGroup(group.key)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-[15.5px] font-bold text-slate-900">{group.label}</h2>
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${meta.bg} ${meta.color}`}>
                            {group.total} Requests
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 mt-0.5">
                          {group.approved} approved ({group.total ? Math.round((group.approved / group.total) * 100) : 0}%) • {group.pending} pending • {group.rejected} rejected
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadGroupedExcel(group.key);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title={`Export ${group.label} requests to Excel`}
                      >
                        <Download size={12} />
                        <span>Export ({group.total})</span>
                      </button>
                    </div>
                  </div>

                  {/* Group Content (Requests Table) */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="bg-white border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-12">#</th>
                            <th className="py-2.5 px-4">Roll Number</th>
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4">Date / Periods</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Description / Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {group.requests.map((r, idx) => {
                            const isApproved = r.status === 'approved';
                            const isPending = r.status === 'pending';
                            const isRejected = r.status === 'rejected';

                            return (
                              <tr key={r.id || idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                                {/* Roll Number */}
                                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                  {r.student?.rollNumber || r.rollNumber || '—'}
                                </td>

                                {/* Student Name & Section */}
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-slate-900 leading-snug">
                                    {r.student?.name || r.studentName || 'Student'}
                                  </p>
                                  <p className="text-[10.5px] text-slate-400 font-normal">
                                    {r.student?.department || r.department || 'CSIT'} • Section {r.student?.section || 'A'}
                                  </p>
                                </td>

                                {/* Date & Periods */}
                                <td className="py-3 px-4 text-slate-600 font-mono text-[11.5px]">
                                  <p className="font-semibold text-slate-800">{r.date}</p>
                                  <p className="text-[10.5px] text-slate-400 font-sans font-medium">
                                    {r.periods ? `Periods: ${r.periods}` : `${r.startTime || ''} - ${r.endTime || ''}`}
                                  </p>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                                      isApproved
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : isPending
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : isRejected
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {isApproved && <CheckCircle2 size={11} />}
                                    {isPending && <Clock size={11} />}
                                    {isRejected && <XCircle size={11} />}
                                    <span className="capitalize">{r.status}</span>
                                  </span>
                                </td>

                                {/* Description */}
                                <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={r.description}>
                                  {r.description || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── Live Interactive Excel Viewer Modal ── */}
      <ExcelSheetViewerModal
        open={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        requests={requestsList}
        title="Faculty Attendance Permission Master Spreadsheet"
        role="faculty"
      />
    </PageWrapper>
  );
}
