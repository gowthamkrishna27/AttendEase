import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserCheck,
  FileText,
  Eye,
  X,
  Edit3,
  Download,
  Check,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { EmptyState } from '../../components/shared/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import ExcelJS from 'exceljs';

// Natural alphanumeric roll number sorter
function compareRollNumbers(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function FacultyStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'counselees' | 'requests'>('counselees');
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manual Attendance Modal State
  const [editingStudent, setEditingStudent] = useState<api.CounseleeStudent | null>(null);
  const [manualMode, setManualMode] = useState<'percentage' | 'sessions'>('percentage');
  const [inputPercentage, setInputPercentage] = useState<number>(85);
  const [inputConducted, setInputConducted] = useState<number>(50);
  const [inputPresent, setInputPresent] = useState<number>(45);

  // Request history modal state
  const [inspectedStudent, setInspectedStudent] = useState<api.CounseleeStudent | null>(null);

  // 1. Query Assigned Counseling Students with Attendance Analytics
  const { data: counselees = [], isLoading: isLoadingCounselees } = useQuery({
    queryKey: ['counselees'],
    queryFn: () => api.getCounselees(),
  });

  // 2. Query Permission Requests assigned to this faculty
  const { data: requestsList = [] } = useQuery({
    queryKey: ['faculty-requests', user?.id],
    queryFn: () => api.getRequests(),
  });

  // Manual Attendance Mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: (payload: { studentId: string; conductedCount?: number; presentCount?: number; percentage?: number }) =>
      api.updateCounseleeAttendance(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['counselees'] });
      setEditingStudent(null);
      setToastMsg(`✅ ${res.message}`);
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg(`❌ ${err.message || 'Failed to update attendance'}`);
      setTimeout(() => setToastMsg(null), 4000);
    },
  });

  const handleOpenEditAttendance = (student: api.CounseleeStudent) => {
    const stats = student.stats || {
      conductedCount: 50,
      presentCount: 42,
      percentage: 85,
    };
    setEditingStudent(student);
    setInputPercentage(stats.percentage || 85);
    setInputConducted(stats.conductedCount || 50);
    setInputPresent(stats.presentCount || 42);
    setManualMode('percentage');
  };

  const handleSaveAttendance = () => {
    if (!editingStudent) return;
    const targetId = editingStudent.id || (editingStudent as any).userId || editingStudent.rollNumber;
    if (manualMode === 'percentage') {
      updateAttendanceMutation.mutate({
        studentId: targetId,
        percentage: Number(inputPercentage),
      });
    } else {
      updateAttendanceMutation.mutate({
        studentId: targetId,
        conductedCount: Number(inputConducted),
        presentCount: Number(inputPresent),
      });
    }
  };

  // Sort strictly by Registered Roll Number (Natural Order)
  const sortedAndFilteredCounselees = useMemo(() => {
    return counselees
      .filter(s => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return (
          (s.rollNumber || s.id || '').toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q) ||
          (s.department || '').toLowerCase().includes(q) ||
          (s.section || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rollA = (a.rollNumber || a.id || '').trim();
        const rollB = (b.rollNumber || b.id || '').trim();
        return compareRollNumbers(rollA, rollB);
      });
  }, [counselees, search]);

  // Unique request students aggregation
  type StudentEntry = {
    id: string;
    name: string;
    rollNumber: string;
    department?: string;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };

  const sortedRequestStudents = useMemo(() => {
    const map = new Map<string, StudentEntry>();
    requestsList.forEach((r: AttendanceRequest) => {
      const sId = r.studentId || r.student?.id || 'unknown';
      const sName = r.student?.name || r.studentName || 'Student';
      const sRoll = r.student?.rollNumber || r.rollNumber || '—';
      const sDept = r.student?.department;

      const existing = map.get(sId);
      if (!existing) {
        map.set(sId, {
          id: sId,
          name: sName,
          rollNumber: sRoll,
          department: sDept,
          total: 1,
          pending: r.status === 'pending' ? 1 : 0,
          approved: r.status === 'approved' ? 1 : 0,
          rejected: r.status === 'rejected' ? 1 : 0,
        });
      } else {
        existing.total++;
        if (r.status === 'pending') existing.pending++;
        if (r.status === 'approved') existing.approved++;
        if (r.status === 'rejected') existing.rejected++;
      }
    });

    return Array.from(map.values())
      .filter(s => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return s.rollNumber.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      })
      .sort((a, b) => compareRollNumbers(a.rollNumber, b.rollNumber));
  }, [requestsList, search]);

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Mentees');

    sheet.columns = [
      { header: 'Registered Number', key: 'rollNumber', width: 20 },
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Department', key: 'department', width: 14 },
      { header: 'Year', key: 'year', width: 12 },
      { header: 'Section', key: 'section', width: 12 },
      { header: 'Conducted', key: 'conducted', width: 14 },
      { header: 'Present', key: 'present', width: 14 },
      { header: 'Exemptions', key: 'exemptions', width: 14 },
      { header: 'Attendance %', key: 'percentage', width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
    headerRow.height = 24;

    sortedAndFilteredCounselees.forEach(s => {
      const stats = s.stats || { conductedCount: 0, presentCount: 0, approvedPermissionsCount: 0, percentage: 85 };
      sheet.addRow({
        rollNumber: s.rollNumber || s.id,
        name: s.name,
        department: s.department || 'CSIT',
        year: s.year || '—',
        section: s.section || '—',
        conducted: stats.conductedCount,
        present: stats.presentCount,
        exemptions: stats.approvedPermissionsCount,
        percentage: `${stats.percentage}%`,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mentee_Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Requests for inspected student
  const inspectedStudentRequests = useMemo(() => {
    if (!inspectedStudent) return [];
    const sId = inspectedStudent.id || (inspectedStudent as any).userId;
    const sRoll = inspectedStudent.rollNumber;
    return requestsList.filter(r => {
      return (
        (r.studentId && (r.studentId === sId || r.studentId === sRoll)) ||
        (r.rollNumber && r.rollNumber === sRoll) ||
        (r.student?.rollNumber && r.student.rollNumber === sRoll) ||
        (r.student?.id && r.student.id === sId)
      );
    });
  }, [inspectedStudent, requestsList]);

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[4px]">
                FACULTY PORTAL
              </span>
              <span className="text-[11px] text-slate-500 font-medium">{user?.name}</span>
            </div>
            <h1 className="text-[20px] font-bold text-[#18181b] tracking-tight mt-1">
              Mentee Attendance &amp; Directory
            </h1>
            <p className="text-[12.5px] text-[#6b7280]">
              Ordered by registered number. Click attendance to manually enter or update records.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'counselees' && sortedAndFilteredCounselees.length > 0 && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[12px] font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>Export Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="p-3 bg-slate-900 text-white text-[12px] font-medium rounded-xl shadow-xs">
            {toastMsg}
          </div>
        )}

        {/* ── Controls: Tabs & Search ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Minimal Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[12px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('counselees');
                setSearch('');
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'counselees'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck size={13} />
              <span>Assigned Mentees ({counselees.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('requests');
                setSearch('');
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText size={13} />
              <span>Request Students ({sortedRequestStudents.length})</span>
            </button>
          </div>

          {/* Minimal Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by registered number or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Tab 1: Mentees Ordered by Registered Number ── */}
        {activeTab === 'counselees' && (
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            {isLoadingCounselees ? (
              <div className="py-12 text-center text-slate-400 text-[12px]">
                Loading assigned mentees…
              </div>
            ) : sortedAndFilteredCounselees.length === 0 ? (
              <EmptyState
                title="No mentees found"
                description={
                  search
                    ? 'No mentee matches your search query.'
                    : 'No counseling students are assigned to you yet.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Registered No</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Dept / Section</th>
                      <th className="py-2.5 px-4 text-center">Live Attendance</th>
                      <th className="py-2.5 px-4">Conducted / Present</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sortedAndFilteredCounselees.map((student, idx) => {
                      const stats = student.stats || {
                        conductedCount: 0,
                        presentCount: 0,
                        approvedPermissionsCount: 0,
                        absentCount: 0,
                        percentage: 85,
                      };
                      const pct = stats.percentage;
                      const isRisk = pct < 75;
                      const isWarning = pct >= 75 && pct < 85;

                      return (
                        <tr key={student.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Registered Roll Number */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {student.rollNumber || student.id}
                          </td>

                          {/* Student Name */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 leading-snug">{student.name}</p>
                            {student.email && (
                              <p className="text-[10.5px] text-slate-400 font-normal">{student.email}</p>
                            )}
                          </td>

                          {/* Department & Section */}
                          <td className="py-3 px-4 text-slate-600">
                            <span>{student.department || 'CSIT'}</span>
                            {student.section && (
                              <span className="text-slate-400 font-normal"> • {student.section}</span>
                            )}
                            {student.year && (
                              <span className="text-slate-400 font-normal"> • {student.year}</span>
                            )}
                          </td>

                          {/* Live Attendance Percentage */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAttendance(student)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11.5px] font-mono font-bold cursor-pointer transition-all ${
                                isRisk
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : isWarning
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Click to manually enter or update attendance"
                            >
                              <span>{pct}%</span>
                              <Edit3 size={10} className="opacity-60 ml-0.5" />
                            </button>
                          </td>

                          {/* Conducted / Present Breakdown */}
                          <td className="py-3 px-4 text-[11.5px] text-slate-600">
                            <span>{stats.presentCount} / {stats.conductedCount}</span>
                            {stats.approvedPermissionsCount > 0 && (
                              <span className="text-orange-600 text-[10.5px] ml-1 font-semibold">
                                (+{stats.approvedPermissionsCount} exempt)
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAttendance(student)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Manually enter attendance"
                            >
                              <Edit3 size={11} />
                              <span>Update</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setInspectedStudent(student)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-all cursor-pointer inline-flex items-center gap-1"
                              title="View requests history"
                            >
                              <Eye size={11} />
                              <span>History</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Request Students ── */}
        {activeTab === 'requests' && (
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            {sortedRequestStudents.length === 0 ? (
              <EmptyState
                title="No request students"
                description={search ? 'No students match your search.' : 'Students who submit permission requests will appear here.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Registered No</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4 text-center">Total Requests</th>
                      <th className="py-2.5 px-4 text-center">Approved</th>
                      <th className="py-2.5 px-4 text-center">Pending</th>
                      <th className="py-2.5 px-4 text-center">Rejected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sortedRequestStudents.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.rollNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4 text-slate-600">{s.department || 'CSIT'}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{s.total}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{s.approved}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">{s.pending}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700">{s.rejected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Minimal Manual Attendance Entry Modal ── */}
        <AnimatePresence>
          {editingStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-[16px] font-bold text-slate-900">Enter Mentee Attendance</h2>
                    <p className="text-[12px] text-slate-500 font-mono">
                      {editingStudent.rollNumber || editingStudent.id} • {editingStudent.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11.5px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setManualMode('percentage')}
                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                      manualMode === 'percentage'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Direct Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode('sessions')}
                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                      manualMode === 'sessions'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Specific Sessions (Present / Conducted)
                  </button>
                </div>

                {/* Mode 1: Direct Percentage */}
                {manualMode === 'percentage' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Attendance Percentage (%):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputPercentage}
                        onChange={e => setInputPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full px-3 py-2 text-[15px] font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-500"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10.5px] text-slate-400 font-medium mr-1">Presets:</span>
                      {[65, 75, 80, 85, 90, 95, 100].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setInputPercentage(val)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                            inputPercentage === val
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 2: Sessions */}
                {manualMode === 'sessions' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Present Sessions:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputPresent}
                        onChange={e => setInputPresent(Number(e.target.value))}
                        className="w-full px-3 py-2 text-[14px] font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Total Conducted:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={inputConducted}
                        onChange={e => setInputConducted(Number(e.target.value))}
                        className="w-full px-3 py-2 text-[14px] font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-500"
                      />
                    </div>

                    <div className="col-span-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] text-slate-600 font-medium flex items-center justify-between">
                      <span>Calculated Percentage:</span>
                      <strong className="font-mono text-[14px] text-slate-900">
                        {inputConducted > 0 ? Math.min(100, Math.round((inputPresent / inputConducted) * 100)) : 0}%
                      </strong>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-3.5 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={updateAttendanceMutation.isPending}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-[12px] font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Check size={13} />
                    <span>Save Attendance</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Request History Modal ── */}
        <AnimatePresence>
          {inspectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">{inspectedStudent.name}</h2>
                    <p className="text-[11.5px] font-mono text-slate-500">
                      {inspectedStudent.rollNumber || inspectedStudent.id} • {inspectedStudent.department || 'CSIT'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedStudent(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-3 flex-1">
                  <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">
                    Permission &amp; Exemption History ({inspectedStudentRequests.length})
                  </h3>

                  {inspectedStudentRequests.length === 0 ? (
                    <p className="text-[12px] text-slate-400 italic py-4 text-center">No permission requests submitted.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectedStudentRequests.map(r => (
                        <div
                          key={r.id}
                          className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-[12px]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{r.reasonLabel || r.reason}</p>
                            <p className="text-[10.5px] text-slate-400 font-mono">{r.date}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectedStudent(null)}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11.5px] font-semibold"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
