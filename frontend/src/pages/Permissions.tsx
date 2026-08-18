import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer, Calendar, RefreshCw, Info,
  ChevronDown, ChevronUp, LayoutGrid, List, CheckCircle2,
  GraduationCap, Building2, Copy, Check
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import * as api from '../lib/api';
import type { AttendanceRequest } from '../types';
import { formatTime, getPeriodsFromRequest } from '../lib/utils';
import srkrEmblem from '../assets/srkr-emblem.png';

export interface ExtendedAttendanceRequest extends AttendanceRequest {
  sectionName?: string;
}

export const WhatsappIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.67-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.523-8.41" />
  </svg>
);

export const formatRollNumberForDisplay = (raw: string): string => {
  const str = raw.trim();
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return num < 10 ? `0${num}` : `${num}`;
  }
  return str;
};

export const sortRollNumbers = (rolls: string[]): string[] => {
  return [...rolls].sort((a, b) => {
    const isNumA = /^\d+$/.test(a);
    const isNumB = /^\d+$/.test(b);
    if (isNumA && isNumB) {
      return parseInt(a, 10) - parseInt(b, 10);
    }
    if (isNumA) return -1;
    if (isNumB) return 1;

    const isLeA = /^LE\d+$/i.test(a);
    const isLeB = /^LE\d+$/i.test(b);
    if (isLeA && isLeB) {
      const numA = parseInt(a.replace(/LE/i, ''), 10);
      const numB = parseInt(b.replace(/LE/i, ''), 10);
      return numA - numB;
    }
    if (isLeA) return 1;
    if (isLeB) return -1;

    return a.localeCompare(b, undefined, { numeric: true });
  });
};

export const PERIOD_TIMINGS: Record<number, { start: string; end: string }> = {
  1: { start: '09:00 AM', end: '09:45 AM' },
  2: { start: '09:45 AM', end: '10:30 AM' },
  3: { start: '10:30 AM', end: '11:15 AM' },
  4: { start: '11:15 AM', end: '12:00 PM' },
  5: { start: '01:30 PM', end: '02:15 PM' },
  6: { start: '02:15 PM', end: '03:00 PM' },
  7: { start: '03:00 PM', end: '03:45 PM' },
  8: { start: '03:45 PM', end: '04:30 PM' },
};

export const getFormattedDateString = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getFormattedTimeString = (selectedPeriods: number[]) => {
  if (selectedPeriods.length > 0) {
    const sorted = [...selectedPeriods].sort((a, b) => a - b);
    const minP = sorted[0];
    const maxP = sorted[sorted.length - 1];
    const startStr = PERIOD_TIMINGS[minP]?.start || '09:00 AM';
    const endStr = PERIOD_TIMINGS[maxP]?.end || '04:30 PM';
    const periodsLabel = sorted.map(p => `P${p}`).join(', ');
    return `${startStr} - ${endStr} (${periodsLabel})`;
  }

  const d = new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

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
    // LE1 to LE13
    for (let i = 1; i <= 13; i++) list.push(`LE${i}`);
    return list;
  }

  // Default (Section A): 1 to 72
  return Array.from({ length: 72 }, (_, i) => String(i + 1));
};

export const extractRollSuffix = (rawRoll: string): string => {
  if (!rawRoll) return '';
  const str = rawRoll.trim().toUpperCase();

  // 1. Explicit LE prefix/infix (e.g. "24B91A07LE1", "24B91A07LE13")
  const leMatch = str.match(/LE0*([1-9]|[12][0-9]|30)$/i);
  if (leMatch) {
    return `LE${parseInt(leMatch[1], 10)}`;
  }

  // 2. Lateral Entry scheme: 95A code (e.g. "25B95A0701" -> "LE1", "25B95A0713" -> "LE13")
  if (str.includes('95A')) {
    const numMatch = str.match(/(\d{1,2})$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 30) {
        return `LE${num}`;
      }
    }
  }

  // 3. Regular 91A scheme (e.g. "24B91A0773" -> "73", "24B91A07B7" -> "B7", "24B91A0705" -> "5")
  const suffixMatch = str.match(/([A-D][0-9]|[0-9]{1,2})$/i);
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
  const isPresent = markedStatus === 'present' && !isPermission;
  const isAbsent = markedStatus === 'absent' && !isPermission;

  // Priority: Permission Approved (Yellow) > Present (Green) > Absent (Red) > Unmarked (White)
  let bgColor = '#FFFFFF';
  let textColor = 'text-slate-800';
  let badgeStyle = 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/40';

  if (isPermission) {
    bgColor = '#FDE047'; // Yellow — Approved Permission
    textColor = 'text-slate-900';
    badgeStyle = 'bg-[#FDE047] border-amber-400 text-slate-900 shadow-amber-200/50 hover:bg-[#FACC15] ring-2 ring-amber-300/40 font-black';
  } else if (isPresent) {
    bgColor = '#5ff797ff'; // Light Green
    textColor = 'text-emerald-950 font-black';
    badgeStyle = 'bg-emerald-300 border-emerald-400 text-emerald-950 shadow-emerald-200/60 hover:bg-emerald-400 ring-2 ring-emerald-300/40 font-black';
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
        isPresent
          ? `Roll #${rollNo}: Marked Present${Boolean(request) ? ' (Has Approved Permission)' : ''}`
          : isAbsent
            ? `Roll #${rollNo}: Marked Absent${Boolean(request) ? ' (Has Approved Permission — marked absent by faculty)' : ''}`
            : isPermission
              ? `Roll #${rollNo}: Approved Permission (${request?.reasonLabel}) - Click to view slip`
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
  selectedPeriodFilters: number[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPass: (pass: ExtendedAttendanceRequest) => void;
  onRollClick: (rollNo: string, pass?: ExtendedAttendanceRequest) => void;
  onMarkAll: (sectionKey: string, status: 'present' | 'absent') => void;
  onOpenWhatsApp: (sectionKey: string) => void;
  viewMode: 'grid' | 'list';
}

const PermissionGrid = React.memo(({
  sectionKey,
  passes,
  markedAttendance,
  attendanceSubmissions,
  selectedSubmissionId,
  selectedPeriodFilters,
  isCollapsed,
  onToggleCollapse,
  onSelectPass,
  onRollClick,
  onMarkAll,
  onOpenWhatsApp,
  viewMode,
}: PermissionGridProps) => {
  const rollNumbers = useMemo(() => getSectionRollNumbers(sectionKey), [sectionKey]);
  const totalStudents = rollNumbers.length;

  // Compute records map from faculty submissions for this section
  const submissionRecordsMap = useMemo(() => {
    const map: Record<string, 'present' | 'absent'> = {};
    let relevantSubmissions = selectedSubmissionId === 'combined'
      ? attendanceSubmissions
      : attendanceSubmissions.filter(s => s.id === selectedSubmissionId);

    if (selectedPeriodFilters.length > 0) {
      relevantSubmissions = relevantSubmissions.filter(sub => {
        const subPeriods = parseSubmissionPeriods(sub.periods);
        return selectedPeriodFilters.some(p => subPeriods.includes(p));
      });
    }

    relevantSubmissions.forEach(sub => {
      sub.records.forEach(rec => {
        const raw = rec.rollNumber;
        const suffix = extractRollSuffix(raw);
        const status = rec.status as 'present' | 'absent';

        map[raw] = status;
        if (suffix) {
          map[suffix] = status;
          const num = parseInt(suffix, 10);
          if (!isNaN(num)) {
            map[String(num)] = status;
            map[String(num).padStart(2, '0')] = status;
          }
        }
      });
    });
    return map;
  }, [attendanceSubmissions, selectedSubmissionId, selectedPeriodFilters]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, ExtendedAttendanceRequest>();

    // Parse active submission periods if a period-specific submission is selected
    const activeSub = selectedSubmissionId !== 'combined'
      ? attendanceSubmissions.find(s => s.id === selectedSubmissionId)
      : null;

    const activePeriodNums: number[] = selectedPeriodFilters.length > 0
      ? selectedPeriodFilters
      : (activeSub && activeSub.periods
        ? activeSub.periods.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n))
        : []);

    passes.forEach(p => {
      // Filter strictly by period if specific period(s) are selected
      if (activePeriodNums.length > 0) {
        const passPeriods = getPeriodsFromRequest(p);
        const hasOverlap = activePeriodNums.some(pNum => passPeriods.includes(pNum));
        if (!hasOverlap) return;
      }

      const rollStr = p.student?.rollNumber ?? p.studentId;
      const suffix = extractRollSuffix(rollStr);
      if (suffix && rollNumbers.includes(suffix)) {
        map.set(suffix, p);
      }
    });
    return map;
  }, [passes, rollNumbers, selectedSubmissionId, attendanceSubmissions, selectedPeriodFilters]);

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
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-orange-400 border border-slate-800">
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
                <span className="w-3.5 h-3.5 rounded bg-emerald-300 border border-emerald-400 inline-block shadow-2xs"></span>
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

            {/* Quick Mark All Header Bar (Just below color identifications) */}
            <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                Quick Mark (In-Memory Only):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMarkAll(sectionKey, 'present')}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  title="Mark all regular students in this section as Present (preserves yellow permission slips)"
                >
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Mark Everyone Present</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMarkAll(sectionKey, 'absent')}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  title="Mark all regular students in this section as Absent (preserves yellow permission slips)"
                >
                  <RefreshCw size={12} className="text-rose-600" />
                  <span>Mark Everyone Absent</span>
                </button>
              </div>
            </div>

            {/* Non-stretching fixed grid container */}
            <div className="p-4 sm:p-6 bg-slate-50/20">
              <div className="flex flex-wrap justify-center gap-3 sm:gap-3.5 max-w-[680px] mx-auto">
                {rollNumbers.map(numStr => {
                  const req = permissionMap.get(numStr);
                  const marked = combinedAttendance[numStr];
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
                          <span>{pass.date} | {formatTime(pass.startTime)} - {formatTime(pass.endTime)}</span>
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

      {/* Attendance Grid Footer (WhatsApp Share Button & Database Lock Notice) */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
            <Info size={14} className="text-orange-500 shrink-0" />
            <span>Public marked attendance is strictly temporary (in-memory) &amp; not saved to database.</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenWhatsApp(sectionKey)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-[12px] flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 shrink-0"
            title="Format and send attendance report to WhatsApp"
          >
            <WhatsappIcon size={17} />
            <span>Share {sectionKey} to WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
});

PermissionGrid.displayName = 'PermissionGrid';

// ── Main Permissions Page ──────────────────────────────────────────────────────
export default function PermissionsPage() {
  const [searchParams] = useSearchParams();

  // Component State
  const [search] = useState('');
  const [selectedYear, setSelectedYear] = useState('3rd Year');
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('CSIT-B');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('combined');
  const [selectedPeriodFilters, setSelectedPeriodFilters] = useState<number[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'all'>('today');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [markedAttendance, setMarkedAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedPass, setSelectedPass] = useState<AttendanceRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeWhatsAppSection, setActiveWhatsAppSection] = useState<string>('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const showToast = useCallback((msg: string, _isError?: boolean) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const handlePeriodToggle = useCallback((pNum: number) => {
    setSelectedPeriodFilters(prev => {
      let next: number[];
      if (prev.includes(pNum)) {
        next = prev.filter(p => p !== pNum);
      } else {
        next = [...prev, pNum].sort((a, b) => a - b);
      }

      if (next.length === 0) {
        showToast('Showing All Periods Attendance');
      } else {
        showToast(`Filtered for Period(s) ${next.map(n => `P${n}`).join(', ')} Permissions & Attendance`);
      }
      return next;
    });
  }, [showToast]);

  // Sync URL params
  useEffect(() => {
    const secParam = searchParams.get('sec');
    if (secParam) setSectionFilter(secParam);
  }, [searchParams]);

  const todayStr = getTodayDateString();

  // Query Backend Requests from Database (Enabled only when section selected)
  const { data: apiRequests = [], isLoading } = useQuery({
    queryKey: ['public-approved-requests', todayStr, sectionFilter, selectedYear],
    queryFn: () => api.getPublicApprovedRequests({
      date: dateMode === 'today' ? todayStr : undefined,
      section: sectionFilter !== 'none' ? sectionFilter : undefined,
      year: selectedYear !== 'all' ? selectedYear : undefined,
    }),
    enabled: sectionFilter !== 'none',
    retry: 1,
  });

  // Query Faculty Attendance Submissions for TODAY ONLY (Enabled only when section selected)
  const { data: attendanceSubmissions = [] } = useQuery<api.AttendanceSubmissionItem[]>({
    queryKey: ['public-attendance-submissions', todayStr, sectionFilter, selectedYear],
    queryFn: () => api.getAttendanceSubmissions(todayStr, sectionFilter, selectedYear),
    enabled: sectionFilter !== 'none',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  /**
   * Bug 9 Fix: Determine section from department + roll number range.
   * The User model has NO `section` field. Section is derived:
   *   - Department CSD → Section A only (CSD — Section A)
   *   - Department CSIT, roll suffix 01–72 → CSIT — Section A
   *   - Department CSIT, roll suffix 73–99 / A0-C9 / D0-D1 / LE1-LE12 → CSIT — Section B
   */
  const getStudentSectionKey = useCallback((req: any): string => {
    const dept = (req.student?.department ?? '').toUpperCase().trim();
    const rawRoll = (req.student?.rollNumber ?? req.studentId ?? '').toUpperCase().trim();

    // CSD students are all in Section A
    if (dept === 'CSD' || rawRoll.startsWith('24B91A05') || rawRoll.startsWith('24B91A03')) {
      return 'CSD — Section A';
    }

    // CSIT: extract the roll suffix (last 2 chars of 24B91A07XX)
    // Roll numbers 01–72 → Section A; 73+ and alpha-suffix → Section B
    const suffix = extractRollSuffix(rawRoll);
    if (!suffix) return 'CSIT — Section A'; // safe default

    // Pure numeric suffix
    if (/^\d+$/.test(suffix)) {
      const num = parseInt(suffix, 10);
      return num >= 73 ? 'CSIT — Section B' : 'CSIT — Section A';
    }

    // Alpha-suffix (A0-C9, D0, D1, LE1-LE12) → Section B
    return 'CSIT — Section B';
  }, []);

  // Filtered Approved List
  const filteredApproved = useMemo(() => {
    const dbApproved = apiRequests.filter(r => r.status === 'approved');
    return dbApproved.filter(req => {
      const studentName = req.student?.name ?? req.studentId ?? '';
      const rollNo = req.student?.rollNumber ?? '';
      const sectionKey = getStudentSectionKey(req);

      const matchesDate = dateMode === 'all' || req.date === todayStr;
      const matchesSearch =
        studentName.toLowerCase().includes(search.toLowerCase()) ||
        rollNo.toLowerCase().includes(search.toLowerCase()) ||
        req.reasonLabel.toLowerCase().includes(search.toLowerCase());

      // Bug 9 Fix: Use the derived sectionKey for accurate filtering
      const matchesSection =
        sectionFilter === 'all' ||
        (sectionFilter === 'CSD-A' && sectionKey === 'CSD — Section A') ||
        (sectionFilter === 'CSIT-A' && sectionKey === 'CSIT — Section A') ||
        (sectionFilter === 'CSIT-B' && sectionKey === 'CSIT — Section B');

      return matchesDate && matchesSearch && matchesSection;
    });
  }, [apiRequests, dateMode, search, sectionFilter, todayStr, getStudentSectionKey]);

  // Group by Section (Ensure standard section keys exist so grids are always rendered)
  const { sectionsMap, sectionKeys } = useMemo(() => {
    const map: Record<string, ExtendedAttendanceRequest[]> = {
      'CSD — Section A': [],
      'CSIT — Section A': [],
      'CSIT — Section B': [],
    };

    filteredApproved.forEach(req => {
      const key = getStudentSectionKey(req);
      if (!map[key]) map[key] = [];
      map[key].push(req as ExtendedAttendanceRequest);
    });

    if (sectionFilter === 'none') {
      return { sectionsMap: map, sectionKeys: [] };
    }

    let keys = Object.keys(map).sort();

    if (sectionFilter === 'CSD-A') {
      keys = keys.filter(k => k.includes('CSD') && k.includes('Section A'));
    } else if (sectionFilter === 'CSIT-A') {
      keys = keys.filter(k => k.includes('CSIT') && k.includes('Section A'));
    } else if (sectionFilter === 'CSIT-B') {
      keys = keys.filter(k => k.includes('CSIT') && (k.includes('Section B') || k.includes('CSIT-B')));
    }

    return { sectionsMap: map, sectionKeys: keys };
  }, [filteredApproved, sectionFilter, getStudentSectionKey]);

  // Filter attendance submissions for current section filter so submissions don't bleed across sections
  const activeSectionSubmissions = useMemo(() => {
    if (sectionFilter === 'all') return attendanceSubmissions;
    return attendanceSubmissions.filter(sub => {
      const subSec = (sub.section || '').toUpperCase().replace(/[\s-]/g, '');
      const filterSec = sectionFilter.toUpperCase().replace(/[\s-]/g, '');
      return subSec.includes(filterSec) || filterSec.includes(subSec);
    });
  }, [attendanceSubmissions, sectionFilter]);

  const handleOpenWhatsApp = useCallback((secKey?: string) => {
    const targetSec = secKey || (sectionKeys.length > 0 ? sectionKeys[0] : 'CSIT — Section B');
    setActiveWhatsAppSection(targetSec);
    setIsWhatsAppModalOpen(true);
  }, [sectionKeys]);

  // WhatsApp Export Calculation
  const whatsAppSectionKey = activeWhatsAppSection || (sectionKeys[0] ?? 'CSIT — Section B');
  const whatsAppRollNumbers = useMemo(() => getSectionRollNumbers(whatsAppSectionKey), [whatsAppSectionKey]);

  const whatsAppAttendanceMap = useMemo(() => {
    const map: Record<string, 'present' | 'absent'> = {};
    const relevantSubmissions = selectedSubmissionId === 'combined'
      ? activeSectionSubmissions
      : activeSectionSubmissions.filter(s => s.id === selectedSubmissionId);

    relevantSubmissions.forEach(sub => {
      sub.records.forEach(rec => {
        const raw = rec.rollNumber;
        const suffix = extractRollSuffix(raw);
        const status = rec.status as 'present' | 'absent';
        map[raw] = status;
        if (suffix) {
          map[suffix] = status;
          const num = parseInt(suffix, 10);
          if (!isNaN(num)) {
            map[String(num)] = status;
            map[String(num).padStart(2, '0')] = status;
          }
        }
      });
    });
    return { ...map, ...markedAttendance };
  }, [activeSectionSubmissions, selectedSubmissionId, markedAttendance, whatsAppSectionKey]);

  const { whatsAppPresentRolls, whatsAppAbsentRolls } = useMemo(() => {
    const present: string[] = [];
    const absent: string[] = [];

    whatsAppRollNumbers.forEach(numStr => {
      const status = whatsAppAttendanceMap[numStr];
      if (status === 'present') {
        present.push(numStr);
      } else if (status === 'absent') {
        absent.push(numStr);
      }
    });

    return {
      whatsAppPresentRolls: sortRollNumbers(present).map(formatRollNumberForDisplay),
      whatsAppAbsentRolls: sortRollNumbers(absent).map(formatRollNumberForDisplay),
    };
  }, [whatsAppRollNumbers, whatsAppAttendanceMap]);

  const formattedWhatsAppText = useMemo(() => {
    const yearNum = selectedYear.replace(/[^0-9]/g, '') || '3';
    const presentText = whatsAppPresentRolls.length > 0 ? whatsAppPresentRolls.join(', ') : 'None';
    const absentText = whatsAppAbsentRolls.length > 0 ? whatsAppAbsentRolls.join(', ') : 'None';

    const dateStr = getFormattedDateString();
    const timeStr = getFormattedTimeString(selectedPeriodFilters);

    return `*Year:* ${yearNum} / 4\n*Branch Name:* ${whatsAppSectionKey}\n*Date:* ${dateStr}\n*Time:* ${timeStr}\n\n*Presentees:*\n${presentText}\n\n*Absentees:*\n${absentText}`;
  }, [selectedYear, whatsAppSectionKey, whatsAppPresentRolls, whatsAppAbsentRolls, selectedPeriodFilters]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectPass = useCallback((pass: AttendanceRequest) => {
    setSelectedPass(pass);
  }, []);

  // Handle Mark Everyone Present / Absent (In-Memory Only)
  const handleMarkAll = useCallback((secKey: string, status: 'present' | 'absent') => {
    const rolls = getSectionRollNumbers(secKey);
    const secPasses = sectionsMap[secKey] || [];

    // Extract roll suffixes of approved permissions in this section to preserve them
    const permissionRollsSet = new Set<string>();
    secPasses.forEach(p => {
      const rollStr = p.student?.rollNumber ?? p.studentId;
      const suffix = extractRollSuffix(rollStr);
      if (suffix) permissionRollsSet.add(suffix);
    });

    setMarkedAttendance(prev => {
      const copy = { ...prev };
      let updatedCount = 0;

      rolls.forEach(numStr => {
        // Preserve yellow permission slips
        if (permissionRollsSet.has(numStr)) return;

        copy[numStr] = status;
        updatedCount++;
      });

      showToast(`Marked ${updatedCount} students in ${secKey} as ${status.toUpperCase()} (Permissions preserved)`);
      return copy;
    });
  }, [sectionsMap, showToast]);

  // Handle Roll Button Click (Interactive in-memory tracker: Unmarked -> Present -> Absent -> Unmarked)
  const handleRollClick = useCallback((rollNo: string, pass?: ExtendedAttendanceRequest) => {
    if (pass) {
      setSelectedPass(pass);
      return;
    }

    setMarkedAttendance(prev => {
      const current = prev[rollNo];
      let next: 'present' | 'absent' | undefined;
      if (!current) next = 'present';
      else if (current === 'present') next = 'absent';
      else next = undefined;

      const copy = { ...prev };
      if (next) {
        copy[rollNo] = next;
        showToast(`Roll #${rollNo} marked ${next === 'present' ? 'PRESENT' : 'ABSENT'}`);
      } else {
        delete copy[rollNo];
        showToast(`Roll #${rollNo} reset to Unmarked`);
      }
      return copy;
    });
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
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${viewMode === 'grid'
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
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${viewMode === 'list'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="List View"
                >
                  <List size={13} />
                  <span>List</span>
                </button>
              </div>

              {Object.keys(markedAttendance).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMarkedAttendance({});
                    showToast('All in-memory marks reset');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Reset all in-memory attendance clicks"
                >
                  <RefreshCw size={12} />
                  <span>Reset Marks ({Object.keys(markedAttendance).length})</span>
                </button>
              )}

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setDateMode('today')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${dateMode === 'today'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Today ({getTodayFormattedDate()})
                </button>
                <button
                  onClick={() => setDateMode('all')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${dateMode === 'all'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All Dates
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpenWhatsApp()}
                className="h-[28px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 shrink-0"
                title="Format and send attendance report to WhatsApp"
              >
                <WhatsappIcon size={14} />
                <span>WhatsApp Report</span>
              </button>
            </div>
          </div>

          {/* ── Section Selector Bar & Year Quick Selection (Matches Faculty Attendance Page) ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-3.5 shadow-xs">

            {/* Top Row: Year Selection (Circle buttons with orange active state) */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
                <GraduationCap size={15} className="text-orange-500" />
                YEAR:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { label: '1', value: '1st Year' },
                  { label: '2', value: '2nd Year' },
                  { label: '3', value: '3rd Year' },
                  { label: '4', value: '4th Year' },
                ].map(yr => (
                  <button
                    key={yr.value}
                    type="button"
                    onClick={() => setSelectedYear(yr.value)}
                    title={yr.value}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer ${selectedYear === yr.value
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                      }`}
                  >
                    {yr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Second Row: Full-width Section Dropdown Bar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                className="w-full h-[42px] px-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-[13px] font-bold text-slate-800 transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-orange-500" />
                  <span className="text-slate-400 font-medium">Select Target Section:</span>
                  <span className="text-slate-900 font-bold">
                    {sectionFilter === 'CSD-A'
                      ? 'CSD — Section A'
                      : sectionFilter === 'CSIT-A'
                        ? 'CSIT — Section A'
                        : sectionFilter === 'CSIT-B'
                          ? 'CSIT — Section B'
                          : sectionFilter === 'all'
                            ? 'All Sections'
                            : 'Choose Section...'}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Section Dropdown Menu List */}
              <AnimatePresence>
                {isSectionDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 right-0 top-[48px] z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1"
                  >
                    {[
                      { label: 'CSD - Sec A', value: 'CSD-A' },
                      { label: 'CSIT - Sec A', value: 'CSIT-A' },
                      { label: 'CSIT - Sec B', value: 'CSIT-B' },
                      { label: 'All Sections', value: 'all' },
                    ].map(sec => (
                      <button
                        key={sec.value}
                        type="button"
                        onClick={() => {
                          setSectionFilter(sec.value);
                          setIsSectionDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[12px] font-bold flex items-center justify-between hover:bg-orange-50 transition-colors cursor-pointer ${sectionFilter === sec.value ? 'text-orange-600 bg-orange-50/60' : 'text-slate-700'
                          }`}
                      >
                        <span>{sec.label}</span>
                        {sectionFilter === sec.value && <CheckCircle2 size={15} className="text-orange-500" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── 8 Linear Period Selector Boxes Widget (Multi-Select Enabled) ── */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  Select Period (1 to 8 Attendance View):
                  {getCurrentPeriodId() && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-[9.5px] font-bold animate-pulse">
                      ⚡ Period {getCurrentPeriodId()} Live Now
                    </span>
                  )}
                  {selectedPeriodFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPeriodFilters([]);
                        showToast('Showing All Periods Attendance');
                      }}
                      className="px-2 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9.5px] font-bold transition-colors cursor-pointer"
                    >
                      Clear Filter (P{selectedPeriodFilters.join(', P')}) ✕
                    </button>
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
                    const sub = activeSectionSubmissions.find(s => parseSubmissionPeriods(s.periods).includes(pNum));
                    const isSelected = selectedPeriodFilters.includes(pNum);
                    const isSubmitted = !!sub;
                    const isLiveNow = getCurrentPeriodId() === pNum;

                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => handlePeriodToggle(pNum)}
                        className={`
                          flex-1 h-[48px] rounded-xl font-black text-[12px] flex flex-col items-center justify-center
                          transition-all duration-150 cursor-pointer border select-none relative
                          ${isSelected
                            ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                            : isLiveNow
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/60 shadow-xs'
                              : isSubmitted
                                ? 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100'
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }
                        `}
                        title={
                          sub
                            ? `Period ${pNum}: Submitted by ${sub.markedBy?.name} (${sub.periodLabel})`
                            : isLiveNow
                              ? `Period ${pNum}: Live Active Period Right Now`
                              : `Period ${pNum}: Click to toggle period selection`
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
                    const sub = activeSectionSubmissions.find(s => parseSubmissionPeriods(s.periods).includes(pNum));
                    const isSelected = selectedPeriodFilters.includes(pNum);
                    const isSubmitted = !!sub;
                    const isLiveNow = getCurrentPeriodId() === pNum;

                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => handlePeriodToggle(pNum)}
                        className={`
                          flex-1 h-[48px] rounded-xl font-black text-[12px] flex flex-col items-center justify-center
                          transition-all duration-150 cursor-pointer border select-none relative
                          ${isSelected
                            ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                            : isLiveNow
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/60 shadow-xs'
                              : isSubmitted
                                ? 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100'
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }
                        `}
                        title={
                          sub
                            ? `Period ${pNum}: Submitted by ${sub.markedBy?.name} (${sub.periodLabel})`
                            : isLiveNow
                              ? `Period ${pNum}: Live Active Period Right Now`
                              : `Period ${pNum}: Click to toggle period selection`
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
                    className={`px-2.5 py-1 font-bold rounded-md shrink-0 transition-all cursor-pointer ${selectedSubmissionId === 'combined'
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
                      className={`px-2.5 py-1 font-bold rounded-md shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${selectedSubmissionId === sub.id
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

          {/* Section Grid Content */}
          {sectionFilter === 'none' ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
                <Building2 size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-[15px]">Select Section & Year to View Today's Attendance</h3>
              <p className="text-slate-500 text-[12px] max-w-md mx-auto">
                Please select your section (CSD, CSIT-A, CSIT-B) and Year above to load today's live attendance & approved permission passes.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-[12px]">Loading today's attendance...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sectionKeys.map(sectionKey => (
                <PermissionGrid
                  key={sectionKey}
                  sectionKey={sectionKey}
                  passes={sectionsMap[sectionKey] || []}
                  markedAttendance={markedAttendance}
                  attendanceSubmissions={activeSectionSubmissions}
                  selectedSubmissionId={selectedSubmissionId}
                  selectedPeriodFilters={selectedPeriodFilters}
                  isCollapsed={Boolean(collapsedSections[sectionKey])}
                  onToggleCollapse={() => toggleSection(sectionKey)}
                  onSelectPass={handleSelectPass}
                  onRollClick={handleRollClick}
                  onMarkAll={handleMarkAll}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Attendance Export Modal */}
        <AnimatePresence>
          {isWhatsAppModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 print:hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
              >
                {/* Modal Header */}
                <div className="bg-emerald-700 px-5 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner">
                      <WhatsappIcon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[16px] leading-tight">Send Attendance to WhatsApp</h3>
                      <p className="text-[11px] text-emerald-100 font-medium">Formatted presentees &amp; absentees report</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsWhatsAppModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-emerald-800/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4">
                  {/* Section Selector */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-[12px]">
                    <span className="font-bold text-slate-700">Target Section:</span>
                    <select
                      value={whatsAppSectionKey}
                      onChange={(e) => setActiveWhatsAppSection(e.target.value)}
                      className="bg-white border border-slate-300 font-bold text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {sectionKeys.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Present</span>
                      <span className="text-[18px] font-black text-emerald-900">{whatsAppPresentRolls.length}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200/80 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absent</span>
                      <span className="text-[18px] font-black text-rose-900">{whatsAppAbsentRolls.length}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
                      <span className="text-[18px] font-black text-slate-800">{whatsAppRollNumbers.length}</span>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Formatted WhatsApp Message:</span>
                      <span className="text-emerald-700 font-mono">Sorted Ascending</span>
                    </div>
                    <textarea
                      readOnly
                      value={formattedWhatsAppText}
                      rows={8}
                      className="w-full p-3.5 bg-emerald-950/5 border border-emerald-200/80 rounded-xl font-mono text-[12.5px] text-slate-800 leading-relaxed focus:outline-none select-all resize-none shadow-inner"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(formattedWhatsAppText);
                        setCopiedWhatsApp(true);
                        showToast('Copied formatted WhatsApp message to clipboard!');
                        setTimeout(() => setCopiedWhatsApp(false), 2500);
                      }}
                      className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[12px] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
                    >
                      {copiedWhatsApp ? (
                        <>
                          <Check size={16} className="text-emerald-600" />
                          <span className="text-emerald-700 font-extrabold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://wa.me/?text=${encodeURIComponent(formattedWhatsAppText)}`;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[12px] rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <WhatsappIcon size={18} />
                      <span>Send directly to WhatsApp</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                    <span className="font-bold text-slate-800">{selectedPass.date} ({formatTime(selectedPass.startTime)} - {formatTime(selectedPass.endTime)})</span>
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
                      I am writing to formally request your approval for an official permission slip. I am <strong>{selectedPass.student?.name ?? selectedPass.studentId}</strong>, bearing Roll Number <strong className="font-mono">{selectedPass.student?.rollNumber ?? selectedPass.studentId}</strong>, studying in 3rd Year, Department of <strong>{selectedPass.student?.department ?? 'CSD'}</strong> (Section <strong>{selectedPass.student?.section ?? (selectedPass as unknown as ExtendedAttendanceRequest).sectionName ?? 'A'}</strong>).
                    </p>
                    <p>
                      I am requesting permission for <strong>{selectedPass.reasonLabel}</strong> on <strong>{selectedPass.date}</strong> for the time duration of <strong>{selectedPass.startTime} to {selectedPass.endTime}</strong>.
                    </p>

                    <div className="pl-4 space-y-2 border-l-2 border-orange-500 bg-orange-50/40 p-3 rounded-r-lg text-[11.5px]">
                      <p><strong>Permission Reason:</strong> {selectedPass.reasonLabel}</p>
                      <p><strong>Purpose &amp; Description:</strong> "{selectedPass.description || 'Permission request for academic/personal reasons.'}"</p>
                      <p><strong>Date &amp; Time Slot:</strong> {selectedPass.date} ({formatTime(selectedPass.startTime)} – {formatTime(selectedPass.endTime)})</p>
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
                      <span className="text-[10px] font-bold text-orange-600 font-serif italic">Verified &amp; Approved</span>
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
