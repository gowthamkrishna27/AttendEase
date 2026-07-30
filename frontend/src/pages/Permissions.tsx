import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Printer, Calendar, RefreshCw, Info,
  AlertCircle, ChevronDown, ChevronUp, LayoutGrid, List, CheckCircle2, XCircle,
  GraduationCap, Building2, Clock
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import * as api from '../lib/api';
import type { AttendanceRequest } from '../types';
import srkrEmblem from '../assets/srkr-emblem.png';

export interface ExtendedAttendanceRequest extends AttendanceRequest {
  sectionName?: string;
}

export const getSectionRollNumbers = (sectionKey: string): string[] => {
  if (sectionKey.includes('CSIT') && sectionKey.includes('B')) {
    const list: string[] = [];
    // 73 to 99
    for (let i = 73; i <= 99; i++) list.push(String(i));
    // A0 to A9
    for (let i = 0; i <= 9; i++) list.push(`A${i}`);
    // B0 to B9
    for (let i = 0; i <= 9; i++) list.push(`B${i}`);
    // C0 to C9
    for (let i = 0; i <= 9; i++) list.push(`C${i}`);
    // D0 to D1
    list.push('D0', 'D1');
    // LE1 to LE12
    for (let i = 1; i <= 12; i++) list.push(`LE${i}`);
    return list;
  }

  // Default (Section A): 1 to 72
  return Array.from({ length: 72 }, (_, i) => String(i + 1));
};

export const extractRollSuffix = (rawRoll: string): string => {
  if (!rawRoll) return '';
  const str = rawRoll.trim().toUpperCase();
  const leMatch = str.match(/LE0*([1-9]|1[0-2])$/);
  if (leMatch) {
    return `LE${leMatch[1]}`;
  }
  const suffixMatch = str.match(/([A-D][0-9]|[0-9]{1,2})$/);
  if (suffixMatch) {
    const val = suffixMatch[1];
    if (/^\d+$/.test(val)) {
      return String(parseInt(val, 10));
    }
    return val;
  }
  return str;
};

export const parseSubmissionPeriods = (periods: any): number[] => {
  if (Array.isArray(periods)) {
    return periods.map(p => Number(p)).filter(p => !isNaN(p));
  }
  if (typeof periods === 'number') {
    return [periods];
  }
  if (typeof periods === 'string') {
    if (periods.includes(',')) {
      return periods.split(',').map(p => Number(p.trim())).filter(p => !isNaN(p));
    }
    if (periods.includes('-')) {
      const parts = periods.split('-');
      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!isNaN(start) && !isNaN(end)) {
        const res: number[] = [];
        for (let i = start; i <= end; i++) res.push(i);
        return res;
      }
    }
    const single = Number(periods);
    if (!isNaN(single)) return [single];
  }
  return [];
};

export const getCurrentPeriodId = (): number | null => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  if (mins >= 540 && mins < 585) return 1;  // 09:00 - 09:45 AM (P1)
  if (mins >= 585 && mins < 630) return 2;  // 09:45 - 10:30 AM (P2)
  if (mins >= 630 && mins < 675) return 3;  // 10:30 - 11:15 AM (P3)
  if (mins >= 675 && mins < 720) return 4;  // 11:15 - 12:00 PM (P4)
  if (mins >= 810 && mins < 855) return 5;  // 01:30 - 02:15 PM (P5)
  if (mins >= 855 && mins < 900) return 6;  // 02:15 - 03:00 PM (P6)
  if (mins >= 900 && mins < 945) return 7;  // 03:00 - 03:45 PM (P7)
  if (mins >= 945 && mins < 990) return 8;  // 03:45 - 04:30 PM (P8)

  return null;
};

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayFormattedDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Reusable Memoized Roll Button Component ───────────────────────────────────
interface RollButtonProps {
  rollNo: string;
  request?: ExtendedAttendanceRequest;
  markedStatus?: 'present' | 'absent';
  onClick: () => void;
}

const RollButton = React.memo(({ rollNo, request, markedStatus, onClick }: RollButtonProps) => {
  const isPermission = Boolean(request);
  const isPresent = markedStatus === 'present';
  const isAbsent = markedStatus === 'absent';

  // Determine dynamic background color & text style
  let bgColor = '#FFFFFF';
  let textColor = 'text-slate-800';
  let badgeStyle = 'bg-white border-amber-300/80 text-slate-800 hover:border-amber-400 hover:bg-amber-50/40';

  if (isPermission) {
    bgColor = '#FDE047'; // Yellow
    textColor = 'text-slate-900';
    badgeStyle = 'bg-[#FDE047] border-amber-400 text-slate-900 shadow-amber-200/50 hover:bg-[#FACC15] ring-2 ring-amber-300/40';
  } else if (isPresent) {
    bgColor = '#10B981'; // Emerald Green
    textColor = 'text-white';
    badgeStyle = 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200/50 hover:bg-emerald-600 ring-2 ring-emerald-300/40';
  } else if (isAbsent) {
    bgColor = '#EF4444'; // Rose Red
    textColor = 'text-white';
    badgeStyle = 'bg-rose-500 border-rose-600 text-white shadow-rose-200/50 hover:bg-rose-600 ring-2 ring-rose-300/40';
  }

  return (
    <motion.button
      layout
      initial={false}
      animate={{
        scale: isPermission || isPresent || isAbsent ? [1, 1.08, 1] : 1,
        backgroundColor: bgColor,
      }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      onClick={onClick}
      className={`
        w-[56px] h-[56px] sm:w-[60px] sm:h-[60px]
        rounded-xl sm:rounded-[14px]
        font-extrabold text-[13px] sm:text-[14px]
        flex items-center justify-center
        select-none cursor-pointer
        transition-all duration-150
        border shadow-2xs shrink-0
        active:scale-95 focus:outline-none
        ${badgeStyle}
        ${textColor}
      `}
      title={
        isPermission
          ? `Roll #${rollNo}: Approved Permission (${request?.reasonLabel}) - Click to view slip`
          : isPresent
          ? `Roll #${rollNo}: Marked Present`
          : isAbsent
          ? `Roll #${rollNo}: Marked Absent`
          : `Roll #${rollNo}: Unmarked`
      }
    >
      {rollNo}
    </motion.button>
  );
});

RollButton.displayName = 'RollButton';

// ── Permission & Attendance Grid Component per Section ────────────────────────
interface PermissionGridProps {
  sectionKey: string;
  passes: ExtendedAttendanceRequest[];
  markedAttendance: Record<string, 'present' | 'absent'>;
  attendanceSubmissions: api.AttendanceSubmissionItem[];
  selectedSubmissionId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPass: (pass: ExtendedAttendanceRequest) => void;
  onRollClick: (rollNo: string, pass?: ExtendedAttendanceRequest) => void;
  viewMode: 'grid' | 'list';
}

const PermissionGrid = React.memo(({
  sectionKey,
  passes,
  markedAttendance,
  attendanceSubmissions,
  selectedSubmissionId,
  isCollapsed,
  onToggleCollapse,
  onSelectPass,
  onRollClick,
  viewMode,
}: PermissionGridProps) => {
  const rollNumbers = useMemo(() => getSectionRollNumbers(sectionKey), [sectionKey]);
  const totalStudents = rollNumbers.length;

  // Compute records map from faculty submissions for this section
  const submissionRecordsMap = useMemo(() => {
    const map: Record<string, 'present' | 'absent'> = {};
    const relevantSubmissions = selectedSubmissionId === 'combined'
      ? attendanceSubmissions
      : attendanceSubmissions.filter(s => s.id === selectedSubmissionId);

    relevantSubmissions.forEach(sub => {
      sub.records.forEach(rec => {
        map[rec.rollNumber] = rec.status as 'present' | 'absent';
      });
    });
    return map;
  }, [attendanceSubmissions, selectedSubmissionId]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, ExtendedAttendanceRequest>();
    passes.forEach(p => {
      const rollStr = p.student?.rollNumber ?? p.studentId;
      const suffix = extractRollSuffix(rollStr);
      if (suffix && rollNumbers.includes(suffix)) {
        map.set(suffix, p);
      }
    });
    return map;
  }, [passes, rollNumbers]);

  const permissionCount = permissionMap.size;
  
  // Combine manual click mode overrides with database submission records
  const combinedAttendance = useMemo(() => {
    return { ...submissionRecordsMap, ...markedAttendance };
  }, [submissionRecordsMap, markedAttendance]);

  const presentCount = useMemo(() => Object.values(combinedAttendance).filter(v => v === 'present').length, [combinedAttendance]);
  const absentCount = useMemo(() => Object.values(combinedAttendance).filter(v => v === 'absent').length, [combinedAttendance]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
      {/* Section Header Bar */}
      <div
        onClick={onToggleCollapse}
        className="px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200/60 select-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[14px] text-slate-900">{sectionKey}</span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200">
              {permissionCount} Permission{permissionCount !== 1 ? 's' : ''}
            </span>
            {presentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {presentCount} Present
              </span>
            )}
            {absentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                {absentCount} Absent
              </span>
            )}
          </div>
        </div>
        {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
      </div>

      {!isCollapsed && (
        viewMode === 'grid' ? (
          <div className="divide-y divide-slate-100">
            {/* Fixed Legend Bar */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/50 text-[11px] font-bold text-slate-700 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[#FDE047] border border-amber-400 inline-block shadow-2xs"></span>
                <span>Permission ({permissionCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs"></span>
                <span>Present ({presentCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600 inline-block shadow-2xs"></span>
                <span>Absent ({absentCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-white border border-amber-300 inline-block shadow-2xs"></span>
                <span>Unmarked ({Math.max(0, totalStudents - permissionCount - presentCount - absentCount)})</span>
              </div>
            </div>

            {/* Non-stretching fixed grid container */}
            <div className="p-4 sm:p-6 bg-slate-50/20">
              <div className="flex flex-wrap justify-center gap-3 sm:gap-3.5 max-w-[680px] mx-auto">
                {rollNumbers.map(numStr => {
                  const req = permissionMap.get(numStr);
                  const marked = markedAttendance[numStr];
                  return (
                    <RollButton
                      key={numStr}
                      rollNo={numStr}
                      request={req}
                      markedStatus={marked}
                      onClick={() => onRollClick(numStr, req)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* List View Mode */
          <div className="divide-y divide-slate-100">
            {passes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-[12px]">
                No approved permission slips in this section.
              </div>
            ) : (
              passes.map((pass, index) => {
                const rollNo = pass.student?.rollNumber ?? pass.studentId;
                const studentName = pass.student?.name ?? `Student (${rollNo})`;

                return (
                  <div
                    key={pass.id}
                    className="p-3.5 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3 text-[12px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{rollNo}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-medium text-slate-700 truncate">{studentName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar size={11} className="text-orange-500 shrink-0" />
                          <span>{pass.date} | {pass.startTime} - {pass.endTime}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 font-bold rounded-lg text-[11px] border border-orange-200/60">
                        {pass.reasonLabel}
                      </span>
                      <button
                        onClick={() => onSelectPass(pass)}
                        className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer size={11} />
                        <span>Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )
      )}
    </div>
  );
});

PermissionGrid.displayName = 'PermissionGrid';

// ── Main Permissions Page ──────────────────────────────────────────────────────
export default function PermissionsPage() {
  const [searchParams] = useSearchParams();

  // Component State
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('3rd Year');
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('combined');
  const [dateMode, setDateMode] = useState<'today' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [markedAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedPass, setSelectedPass] = useState<AttendanceRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  // Sync URL params
  useEffect(() => {
    const secParam = searchParams.get('sec');
    if (secParam) setSectionFilter(secParam);
  }, [searchParams]);

  const todayStr = getTodayDateString();

  // Query Backend Requests from Database
  const { data: apiRequests = [], isLoading } = useQuery({
    queryKey: ['public-approved-requests'],
    queryFn: async () => {
      try {
        const publicRequests = await api.getPublicApprovedRequests();
        if (publicRequests.length > 0) return publicRequests;
        return await api.getRequests();
      } catch (err) {
        console.warn('Public query error, falling back to getRequests:', err);
        try {
          return await api.getRequests();
        } catch {
          return [];
        }
      }
    },
    retry: false,
  });

  // Query Faculty Attendance Submissions from Database
  const { data: attendanceSubmissions = [] } = useQuery<api.AttendanceSubmissionItem[]>({
    queryKey: ['public-attendance-submissions', todayStr, sectionFilter, selectedYear],
    queryFn: () => api.getAttendanceSubmissions(todayStr, sectionFilter, selectedYear),
  });

  // Filtered Approved List
  const filteredApproved = useMemo(() => {
    const dbApproved = apiRequests.filter(r => r.status === 'approved');
    return dbApproved.filter(req => {
      const studentName = req.student?.name ?? req.studentId ?? '';
      const rollNo = req.student?.rollNumber ?? '';
      const dept = req.student?.department ?? 'CSD';
      const studentSec = req.student?.section ?? (req.studentId.slice(-2) < '35' ? 'A' : 'B');
      const secName = req.sectionName ?? `${dept} — Section ${studentSec}`;

      const matchesDate = dateMode === 'all' || req.date === todayStr;
      const matchesSearch =
        studentName.toLowerCase().includes(search.toLowerCase()) ||
        rollNo.toLowerCase().includes(search.toLowerCase()) ||
        req.reasonLabel.toLowerCase().includes(search.toLowerCase());

      const matchesSection =
        sectionFilter === 'all' ||
        (sectionFilter === 'CSD-A' && secName.includes('CSD') && secName.includes('Section A')) ||
        (sectionFilter === 'CSIT-A' && secName.includes('CSIT') && secName.includes('Section A')) ||
        (sectionFilter === 'CSIT-B' && secName.includes('CSIT') && secName.includes('Section B'));

      return matchesDate && matchesSearch && matchesSection;
    });
  }, [apiRequests, dateMode, search, sectionFilter, todayStr]);

  // Group by Section (Ensure default section exists if empty so grid remains still)
  const { sectionsMap, sectionKeys } = useMemo(() => {
    const map: Record<string, ExtendedAttendanceRequest[]> = {};
    filteredApproved.forEach(req => {
      const dept = req.student?.department ?? 'CSD';
      const sec = req.student?.section ?? (req.studentId.slice(-2) < '35' ? 'A' : 'B');
      const key = req.sectionName ?? `${dept} — Section ${sec}`;
      if (!map[key]) map[key] = [];
      map[key].push(req);
    });

    let keys = Object.keys(map).sort();
    if (keys.length === 0) {
      const defaultSec = sectionFilter !== 'all' ? sectionFilter : 'CSD — Section A';
      map[defaultSec] = [];
      keys = [defaultSec];
    }
    return { sectionsMap: map, sectionKeys: keys };
  }, [filteredApproved, sectionFilter]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectPass = useCallback((pass: AttendanceRequest) => {
    setSelectedPass(pass);
  }, []);

  // Handle Roll Button Click (Opens permission slip modal if student has approved pass, or shows info toast)
  const handleRollClick = useCallback((rollNo: string, pass?: ExtendedAttendanceRequest) => {
    if (pass) {
      setSelectedPass(pass);
      return;
    }
    showToast(`Roll #${rollNo}: View period submissions above or select a period for details.`);
  }, [showToast]);

  return (
    <PageWrapper role="viewer">
      <div className="max-w-[820px] mx-auto space-y-4">

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[12px] shadow-lg flex items-center gap-2 print:hidden"
            >
              <Info size={15} className="text-orange-400" />
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── On-Screen Page UI (Hidden when printing) ── */}
        <div className="space-y-4 print:hidden">
          {/* Title Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-3 gap-3">
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 leading-tight">
                Approved Permissions &amp; Attendance
              </h1>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {dateMode === 'today' ? `Today's Grid (${getTodayFormattedDate()})` : 'All Permission Slips Grid'}
              </p>
            </div>

            {/* Controls: View Mode & Date Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid View (Roll 1-72)"
                >
                  <LayoutGrid size={13} />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
                    viewMode === 'list'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List View"
                >
                  <List size={13} />
                  <span>List</span>
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setDateMode('today')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    dateMode === 'today'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today ({getTodayFormattedDate()})
                </button>
                <button
                  onClick={() => setDateMode('all')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    dateMode === 'all'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Dates
                </button>
              </div>
            </div>
          </div>

          {/* ── Section Selector Bar & Year Quick Selection ── */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-2.5">
            {/* Section Selector Dropdown Bar (Full Width) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                className="w-full h-[40px] px-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg flex items-center justify-between text-[12px] font-bold text-slate-800 transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-orange-500" />
                  <span className="text-slate-400 font-medium">Select Section:</span>
                  <span className="text-slate-900 font-bold">
                    {sectionFilter === 'all'
                      ? 'All Sections'
                      : sectionFilter === 'CSD-A'
                      ? 'CSD - Sec A'
                      : sectionFilter === 'CSIT-A'
                      ? 'CSIT - Sec A'
                      : 'CSIT - Sec B'}
                  </span>
                </div>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Section Dropdown Menu List */}
              <AnimatePresence>
                {isSectionDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 right-0 top-[44px] z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1"
                  >
                    {[
                      { label: 'All Sections', value: 'all' },
                      { label: 'CSD - Sec A', value: 'CSD-A' },
                      { label: 'CSIT - Sec A', value: 'CSIT-A' },
                      { label: 'CSIT - Sec B', value: 'CSIT-B' },
                    ].map(sec => (
                      <button
                        key={sec.value}
                        type="button"
                        onClick={() => {
                          setSectionFilter(sec.value);
                          setIsSectionDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-[12px] font-bold flex items-center justify-between hover:bg-orange-50 transition-colors cursor-pointer ${
                          sectionFilter === sec.value ? 'text-orange-600 bg-orange-50/60' : 'text-slate-700'
                        }`}
                      >
                        <span>{sec.label}</span>
                        {sectionFilter === sec.value && <CheckCircle2 size={14} className="text-orange-500" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Year Selector Buttons (Replacing quick select buttons) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <GraduationCap size={12} className="text-orange-500" />
                Year:
              </span>
              {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 font-bold rounded-md cursor-pointer shrink-0 transition-all ${
                    selectedYear === yr
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* ── 8 Linear Period Selector Boxes Widget (User requirement) ── */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  Select Period (1 to 8 Attendance View):
                  {getCurrentPeriodId() && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-[9.5px] font-bold animate-pulse">
                      ⚡ Period {getCurrentPeriodId()} Live Now
                    </span>
                  )}
                </span>
                <span className="text-[10.5px] font-bold text-slate-400">
                  {attendanceSubmissions.length} Submission(s) Active
                </span>
              </div>

              {/* 8 Linear Square Boxes Row */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                {/* Morning Session: Periods 1-4 */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  {[1, 2, 3, 4].map(pNum => {
                    const sub = attendanceSubmissions.find(s => parseSubmissionPeriods(s.periods).includes(pNum));
                    const isSelected = sub && selectedSubmissionId === sub.id;
                    const isSubmitted = !!sub;
                    const isLiveNow = getCurrentPeriodId() === pNum;

                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => {
                          if (sub) {
                            setSelectedSubmissionId(sub.id);
                            showToast(`Showing Period ${pNum} Attendance (Submitted by ${sub.markedBy?.name || 'Faculty'})`);
                          } else {
                            showToast(`Period ${pNum} attendance has not been submitted by faculty yet.`, true);
                          }
                        }}
                        className={`
                          flex-1 h-[48px] rounded-xl font-black text-[12px] flex flex-col items-center justify-center
                          transition-all duration-150 cursor-pointer border select-none relative
                          ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                              : isLiveNow
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/60 shadow-xs'
                              : isSubmitted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }
                        `}
                        title={
                          sub
                            ? `Period ${pNum}: Submitted by ${sub.markedBy?.name} (${sub.periodLabel})`
                            : isLiveNow
                            ? `Period ${pNum}: Live Active Period Right Now`
                            : `Period ${pNum}: Not yet submitted`
                        }
                      >
                        {isLiveNow && (
                          <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[7.5px] font-black tracking-widest shadow-2xs uppercase animate-pulse">
                            Live
                          </span>
                        )}
                        <span className="text-[13px] leading-none">P{pNum}</span>
                        <span className="text-[8px] font-bold opacity-80 mt-0.5">
                          {isSubmitted ? (sub?.markedBy?.name ? sub.markedBy.name.split(' ')[0] : 'Done') : 'Pending'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Lunch Break Divider */}
                <div className="px-2 py-1 bg-amber-100/90 text-amber-900 border border-amber-300/80 rounded-lg text-[9.5px] font-black uppercase tracking-wider shrink-0 text-center">
                  Lunch<br />12:00 - 1:30
                </div>

                {/* Afternoon Session: Periods 5-8 */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  {[5, 6, 7, 8].map(pNum => {
                    const sub = attendanceSubmissions.find(s => parseSubmissionPeriods(s.periods).includes(pNum));
                    const isSelected = sub && selectedSubmissionId === sub.id;
                    const isSubmitted = !!sub;
                    const isLiveNow = getCurrentPeriodId() === pNum;

                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => {
                          if (sub) {
                            setSelectedSubmissionId(sub.id);
                            showToast(`Showing Period ${pNum} Attendance (Submitted by ${sub.markedBy?.name || 'Faculty'})`);
                          } else {
                            showToast(`Period ${pNum} attendance has not been submitted by faculty yet.`, true);
                          }
                        }}
                        className={`
                          flex-1 h-[48px] rounded-xl font-black text-[12px] flex flex-col items-center justify-center
                          transition-all duration-150 cursor-pointer border select-none relative
                          ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                              : isLiveNow
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/60 shadow-xs'
                              : isSubmitted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }
                        `}
                        title={
                          sub
                            ? `Period ${pNum}: Submitted by ${sub.markedBy?.name} (${sub.periodLabel})`
                            : isLiveNow
                            ? `Period ${pNum}: Live Active Period Right Now`
                            : `Period ${pNum}: Not yet submitted`
                        }
                      >
                        {isLiveNow && (
                          <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[7.5px] font-black tracking-widest shadow-2xs uppercase animate-pulse">
                            Live
                          </span>
                        )}
                        <span className="text-[13px] leading-none">P{pNum}</span>
                        <span className="text-[8px] font-bold opacity-80 mt-0.5">
                          {isSubmitted ? (sub?.markedBy?.name ? sub.markedBy.name.split(' ')[0] : 'Done') : 'Pending'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Faculty Attendance Submissions Switcher Bar ── */}
            {attendanceSubmissions.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Faculty Attendance Submissions:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionId('combined')}
                    className={`px-2.5 py-1 font-bold rounded-md shrink-0 transition-all cursor-pointer ${
                      selectedSubmissionId === 'combined'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Combined Overview
                  </button>
                  {attendanceSubmissions.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubmissionId(sub.id)}
                      className={`px-2.5 py-1 font-bold rounded-md shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedSubmissionId === sub.id
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      <span>{sub.markedBy?.name}:</span>
                      <span className="opacity-90">{sub.periodLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Section Grid Content (1-72 Grid Always Displayed) */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-[12px]">Loading permissions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sectionKeys.map(sectionKey => (
                <PermissionGrid
                  key={sectionKey}
                  sectionKey={sectionKey}
                  passes={sectionsMap[sectionKey] || []}
                  markedAttendance={markedAttendance}
                  attendanceSubmissions={attendanceSubmissions}
                  selectedSubmissionId={selectedSubmissionId}
                  isCollapsed={Boolean(collapsedSections[sectionKey])}
                  onToggleCollapse={() => toggleSection(sectionKey)}
                  onSelectPass={handleSelectPass}
                  onRollClick={handleRollClick}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Printable Slip Modal */}
        <AnimatePresence>
          {selectedPass && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 print:static print:bg-white print:p-0 print:inset-auto print:z-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl max-w-md w-full p-4 shadow-2xl border border-slate-200 print:hidden"
              >
                <div className="text-center pb-3 border-b-2 border-slate-900">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">SRKR Engineering College</p>
                  <h2 className="text-[17px] font-black text-slate-900 uppercase">Permission Slip</h2>
                  <p className="text-[10px] text-orange-600 font-bold bg-orange-50 inline-block px-2 py-0.5 rounded-full border border-orange-200 mt-1">
                    APPROVED • #{selectedPass.id.toUpperCase()}
                  </p>
                </div>

                <div className="py-4 space-y-2 text-[12px]">
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <img
                      src={selectedPass.student?.avatarUrl || `https://srkrexams.in/SRKR/photo/${selectedPass.student?.rollNumber || selectedPass.studentId}.jpg`}
                      alt="Student Avatar"
                      className="w-12 h-14 object-cover rounded-md border border-slate-300 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPass.student?.name || 'Student')}&background=0F172A&color=fff`;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500 font-mono">Roll Number:</p>
                      <p className="font-mono font-bold text-slate-900 text-[14px]">{selectedPass.student?.rollNumber ?? selectedPass.studentId}</p>
                      <p className="font-bold text-slate-800 text-[12px] truncate mt-0.5">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reason / Category:</span>
                    <span className="font-bold text-orange-600">{selectedPass.reasonLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date &amp; Time Slot:</span>
                    <span className="font-bold text-slate-800">{selectedPass.date} ({selectedPass.startTime} - {selectedPass.endTime})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved By:</span>
                    <span className="font-bold text-slate-900">{selectedPass.finalDecisionName || selectedPass.faculty?.name || 'Faculty Advisor'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 italic">
                    "{selectedPass.description}"
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Printer size={13} />
                    <span>Print Letter Format</span>
                  </button>
                  <button
                    onClick={() => setSelectedPass(null)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>

              {/* Printable Letter Format */}
              <div className="hidden print:block bg-white p-6 sm:p-8 text-slate-900 font-sans leading-relaxed w-full min-h-[255mm] flex flex-col justify-between mx-auto text-[12px]">
                <div>
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                      SAGI RAMAKRISHNAM RAJU ENGINEERING COLLEGE (AUTONOMOUS)
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      CHINA AMIRAM, BHIMAVARAM — 534 204, W.G. Dist., Andhra Pradesh, India
                    </p>
                  </div>

                  <div className="grid grid-cols-12 items-start text-[12px] font-medium mb-4 gap-2 border-b border-slate-200/80 pb-3">
                    <div className="col-span-5 space-y-0.5">
                      <p className="font-bold text-slate-900 uppercase text-[11px]">From:</p>
                      <p className="font-bold text-slate-900">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                      <p className="font-mono text-slate-700 font-bold">Roll No: {selectedPass.student?.rollNumber ?? selectedPass.studentId}</p>
                      <p className="text-slate-600 text-[11.5px]">Department of {selectedPass.student?.department ?? 'CSD'} &amp; CSIT</p>
                      <p className="text-slate-600 text-[11.5px]">SRKR Engineering College (Autonomous)</p>
                    </div>

                    <div className="col-span-4 text-center space-y-1 self-center">
                      <div className="inline-block px-3 py-1 bg-slate-50 border border-slate-300 rounded-md">
                        <p className="font-bold text-slate-900 text-[11.5px]">Date: {selectedPass.date}</p>
                        <p className="font-mono text-slate-600 text-[10.5px]">Ref: SRKR/PERM/{selectedPass.id.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="col-span-3 flex justify-end">
                      <div className="w-[72px] h-[90px] border-2 border-slate-900 rounded-sm bg-white overflow-hidden flex flex-col items-center justify-center relative shadow-2xs">
                        <img
                          src={selectedPass.student?.avatarUrl || `https://srkrexams.in/SRKR/photo/${(selectedPass.student?.rollNumber || selectedPass.studentId).toUpperCase()}.jpg`}
                          alt="Student Photo"
                          className="w-full h-full object-cover block"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPass.student?.name || 'Student')}&background=0F172A&color=fff`;
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[12px] font-medium mb-4 space-y-0.5">
                    <p className="font-bold text-slate-900 uppercase text-[11px]">To:</p>
                    <p className="font-bold text-slate-900">The Head of the Department (HOD)</p>
                    <p className="text-slate-700">Department of {selectedPass.student?.department ?? 'CSD'}</p>
                    <p className="text-slate-700">SRKR Engineering College (Autonomous), Bhimavaram</p>
                  </div>

                  <div className="my-4 p-3 bg-slate-50 border-y border-slate-300 font-bold text-[12px] sm:text-[13px] text-slate-900 leading-snug">
                    Subject: Application requesting official permission for {selectedPass.reasonLabel} — "{selectedPass.description}"
                  </div>

                  <div className="space-y-3 text-[12px] leading-relaxed text-slate-800">
                    <p className="font-bold text-slate-900">Respected Sir/Madam,</p>
                    <p>
                      I am writing to formally request your approval for an official permission slip. I am <strong>{selectedPass.student?.name ?? selectedPass.studentId}</strong>, bearing Roll Number <strong className="font-mono">{selectedPass.student?.rollNumber ?? selectedPass.studentId}</strong>, studying in 3rd Year, Department of <strong>{selectedPass.student?.department ?? 'CSD'}</strong> (Section <strong>{selectedPass.student?.section ?? 'A'}</strong>).
                    </p>
                    <p>
                      I am requesting permission for <strong>{selectedPass.reasonLabel}</strong> on <strong>{selectedPass.date}</strong> for the time duration of <strong>{selectedPass.startTime} to {selectedPass.endTime}</strong>.
                    </p>

                    <div className="pl-4 space-y-2 border-l-2 border-orange-500 bg-orange-50/40 p-3 rounded-r-lg text-[11.5px]">
                      <p><strong>Permission Reason:</strong> {selectedPass.reasonLabel}</p>
                      <p><strong>Purpose &amp; Description:</strong> "{selectedPass.description || 'Permission request for academic/personal reasons.'}"</p>
                      <p><strong>Date &amp; Time Slot:</strong> {selectedPass.date} ({selectedPass.startTime} – {selectedPass.endTime})</p>
                      <p><strong>Approved Faculty Advisor:</strong> {selectedPass.faculty?.name ?? 'Faculty Advisor'}</p>
                    </div>

                    <p>
                      I assure you that I will make up for any missed coursework or lab sessions promptly. I kindly request you to grant me permission for the specified duration.
                    </p>
                    <p>Thank you for your time, consideration, and continuous support.</p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-[11px] font-sans">
                  <div>
                    <p className="font-bold text-slate-900 mb-4">Yours sincerely,</p>
                    <div className="h-7 border-b border-slate-400 w-40 mb-1"></div>
                    <p className="font-bold text-slate-900">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-slate-900 mb-4">Forwarded &amp; Approved by:</p>
                    <div className="h-7 border-b border-slate-400 w-44 mb-1 mx-auto flex items-end justify-center pb-0.5">
                      <span className="text-[10px] font-bold text-emerald-700 font-serif italic">Verified &amp; Approved</span>
                    </div>
                    <p className="font-bold text-slate-900">{selectedPass.faculty?.name ?? 'Faculty Advisor'}</p>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 border-2 border-orange-500 rounded-full flex flex-col items-center justify-center bg-orange-50/70 shadow-2xs transform -rotate-12 p-1 border-dashed">
                      <img src={srkrEmblem} alt="SRKR Emblem" className="w-7 h-7 object-contain mb-0.5 opacity-90" />
                      <span className="text-[7.5px] font-black uppercase text-orange-600 tracking-tighter leading-none">ATTENDEASE</span>
                      <span className="text-[6.5px] font-bold uppercase text-slate-700 tracking-tighter leading-none">OFFICIAL SEAL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
