import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Building2, ChevronDown, CheckCircle2, AlertCircle,
  Calendar, Clock, Save, Lock, Check, RefreshCw
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import type { AttendanceSubmissionItem } from '../../lib/api';
import { getPeriodsFromRequest, extractRollSuffix } from '../../lib/utils';

// Period Definition with 45-min slots and 12:00 - 1:30 PM Lunch Break
export interface PeriodSlot {
  id: number;
  label: string;
  timeRange: string;
  startTime: string;
  endTime: string;
}

const PERIOD_SLOTS: PeriodSlot[] = [
  { id: 1, label: 'Period 1', timeRange: '09:00 AM - 09:45 AM', startTime: '09:00', endTime: '09:45' },
  { id: 2, label: 'Period 2', timeRange: '09:45 AM - 10:30 AM', startTime: '09:45', endTime: '10:30' },
  { id: 3, label: 'Period 3', timeRange: '10:30 AM - 11:15 AM', startTime: '10:30', endTime: '11:15' },
  { id: 4, label: 'Period 4', timeRange: '11:15 AM - 12:00 PM', startTime: '11:15', endTime: '12:00' },
  { id: 5, label: 'Period 5', timeRange: '01:30 PM - 02:15 PM', startTime: '13:30', endTime: '14:15' },
  { id: 6, label: 'Period 6', timeRange: '02:15 PM - 03:00 PM', startTime: '14:15', endTime: '15:00' },
  { id: 7, label: 'Period 7', timeRange: '03:00 PM - 03:45 PM', startTime: '15:00', endTime: '15:45' },
  { id: 8, label: 'Period 8', timeRange: '03:45 PM - 04:30 PM', startTime: '15:45', endTime: '16:30' },
];

function getTodayFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FacultyAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Selection States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayFormattedDate());
  const [selectedYear, setSelectedYear] = useState<string>('3rd Year');
  const [sectionFilter, setSectionFilter] = useState<string>('CSIT-B');
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState<boolean>(false);
  
  // Selected Periods (e.g. [1, 2])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);

  // Marking mode: 'present' or 'absent'
  const [markMode, setMarkMode] = useState<'present' | 'absent'>('present');

  // Marked attendance state: rollNumber -> 'present' | 'absent'
  const [markedAttendance, setMarkedAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  
  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = useCallback((text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Format periods string key e.g. "1,2"
  const periodsKey = useMemo(() => {
    return [...selectedPeriodIds].sort((a, b) => a - b).join(',');
  }, [selectedPeriodIds]);

  // Format human-readable period label
  const periodLabelString = useMemo(() => {
    if (selectedPeriodIds.length === 0) return 'No period selected';
    const sorted = [...selectedPeriodIds].sort((a, b) => a - b);
    const slots = sorted.map(id => PERIOD_SLOTS.find(p => p.id === id)).filter(Boolean) as PeriodSlot[];
    if (slots.length === 1) return `${slots[0].label} (${slots[0].timeRange})`;
    
    const first = slots[0];
    const last = slots[slots.length - 1];
    return `Periods ${sorted.join(' & ')} (${first.timeRange.split(' - ')[0]} - ${last.timeRange.split(' - ')[1]})`;
  }, [selectedPeriodIds]);

  // Query existing attendance submissions for date & section
  const { data: existingSubmissions = [] } = useQuery<AttendanceSubmissionItem[]>({
    queryKey: ['attendanceSubmissions', selectedDate, sectionFilter, selectedYear],
    queryFn: () => api.getAttendanceSubmissions(selectedDate, sectionFilter, selectedYear),
  });

  // Stable empty-array constant — avoids new reference on every render when query data is undefined.
  // BUG FIX: Using `= []` inline creates a new array reference each render → permissionStudentsSet
  // recalculates → useEffect fires → setMarkedAttendance called every render → infinite loop.
  const STABLE_EMPTY = useMemo<api.AttendanceRequest[]>(() => [], []);

  // Query approved permission passes for date pre-highlighting
  const { data: approvedRequestsRaw } = useQuery({
    queryKey: ['public-approved-requests-for-attendance', selectedDate, sectionFilter, selectedYear, user?.department],
    queryFn: () => api.getPublicApprovedRequests({
      date: selectedDate,
      section: sectionFilter,
      year: selectedYear,
      department: user?.department,
    }),
    retry: 1,
  });
  const approvedRequests = approvedRequestsRaw ?? STABLE_EMPTY;

  // Map students who have approved permission passes for selectedDate AND matching selectedPeriodIds
  const permissionStudentsSet = useMemo(() => {
    const set = new Set<string>();
    approvedRequests.forEach(req => {
      if (req.status === 'approved' && req.date === selectedDate) {
        // Period overlap check: req periods must overlap with currently selected faculty periods
        const reqPeriods = getPeriodsFromRequest(req);
        const hasOverlap = selectedPeriodIds.some(pId => reqPeriods.includes(pId));

        if (hasOverlap) {
          const rollStr = req.student?.rollNumber ?? req.studentId ?? '';
          if (rollStr) {
            set.add(rollStr);
            const suffix = extractRollSuffix(rollStr);
            if (suffix) {
              set.add(suffix);
            }
          }
        }
      }
    });
    return set;
  }, [approvedRequests, selectedDate, selectedPeriodIds]);

  // Derive a stable primitive string from the Set so useEffect can use it as a dep
  // without firing on every render due to Set object reference changes.
  const permissionRollsKey = useMemo(
    () => [...permissionStudentsSet].sort().join(','),
    [permissionStudentsSet]
  );

  // Find submission matching current selected periods
  // Bug 11 Fix: Normalize both sides to sorted comma-separated form
  // so "2,1" stored in DB matches "1,2" from frontend
  const currentSubmission = useMemo(() => {
    const normalizePeriodsStr = (p: string | number | undefined | null): string => {
      if (!p) return '';
      const s = String(p).trim();
      const nums = s.includes(',')
        ? s.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n))
        : [Number(s)].filter(n => !isNaN(n));
      return [...new Set(nums)].sort((a, b) => a - b).join(',');
    };
    const normalizedKey = normalizePeriodsStr(periodsKey);
    return existingSubmissions.find(sub => normalizePeriodsStr(String(sub.periods)) === normalizedKey);
  }, [existingSubmissions, periodsKey]);

  // Check ownership (Faculty can update attendance they personally marked, Admin & HOD can edit all)
  const isOwner = useMemo(() => {
    if (!currentSubmission) return true;
    const currentUserId = (user?.id || user?.userId || '').toLowerCase().trim();
    const markedById = (currentSubmission.markedById || '').toLowerCase().trim();
    const userEmail = (user?.email || '').toLowerCase().trim();
    const markedEmail = (currentSubmission.markedBy?.email || '').toLowerCase().trim();

    return (
      (currentUserId && markedById && currentUserId === markedById) ||
      (userEmail && markedEmail && userEmail === markedEmail) ||
      user?.role === 'admin' ||
      user?.role === 'hod'
    );
  }, [currentSubmission, user]);

  // Ref to track the last submission ID and permissionRollsKey that triggered a re-population
  // to prevent useEffect from calling setMarkedAttendance when nothing actually changed.
  const lastPopulatedRef = useRef<{ submissionId: string | undefined; permissionKey: string }>({
    submissionId: undefined,
    permissionKey: '',
  });

  // Populate grid when switching periods/date/section if a submission exists, and pre-mark permissions as present
  // BUG FIX: Use permissionRollsKey (stable string) instead of permissionStudentsSet (object ref)
  // to prevent re-firing on every render when Set content hasn't actually changed.
  useEffect(() => {
    const submissionId = currentSubmission?.id;
    const prevRef = lastPopulatedRef.current;

    // Early exit: skip if nothing content-wise has changed
    if (submissionId === prevRef.submissionId && permissionRollsKey === prevRef.permissionKey) {
      return;
    }
    lastPopulatedRef.current = { submissionId, permissionKey: permissionRollsKey };

    const initialMap: Record<string, 'present' | 'absent'> = {};
    if (currentSubmission && currentSubmission.records) {
      currentSubmission.records.forEach(rec => {
        initialMap[rec.rollNumber] = rec.status as 'present' | 'absent';
      });
    }
    // Automatically default students with approved permissions to present if unmarked
    permissionStudentsSet.forEach(roll => {
      if (!initialMap[roll]) {
        initialMap[roll] = 'present';
      }
    });
    setMarkedAttendance(initialMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubmission, permissionRollsKey]);

  // Roll numbers generator for section
  const currentRollNumbers = useMemo(() => {
    if (sectionFilter.includes('B') || sectionFilter === 'CSIT-B') {
      const rolls: string[] = [];
      for (let i = 73; i <= 99; i++) rolls.push(String(i));
      const series = ['A', 'B', 'C'];
      series.forEach(prefix => {
        for (let i = 0; i <= 9; i++) rolls.push(`${prefix}${i}`);
      });
      rolls.push('D0', 'D1');
      for (let i = 1; i <= 12; i++) rolls.push(`LE${i}`);
      return rolls;
    }
    // Section A (CSD, CSD-A, CSIT-A, CSIT A)
    return Array.from({ length: 72 }, (_, i) => String(i + 1));
  }, [sectionFilter]);

  // Toggle roll button state
  const handleRollClick = useCallback((roll: string) => {
    if (!isOwner) {
      showToast(`Read-only: Attendance was submitted by ${currentSubmission?.markedBy?.name ?? 'another faculty'}`, true);
      return;
    }

    setMarkedAttendance(prev => {
      const current = prev[roll];
      if (!current) {
        return { ...prev, [roll]: markMode };
      }
      if (current === markMode) {
        const next = { ...prev };
        delete next[roll];
        return next;
      }
      return { ...prev, [roll]: markMode };
    });
  }, [isOwner, markMode, currentSubmission, showToast]);

  // Period Slot Toggle
  const togglePeriodSlot = (id: number) => {
    setSelectedPeriodIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least 1 period selected
        return prev.filter(p => p !== id);
      }
      return [...prev, id];
    });
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: api.SubmitAttendancePayload) => api.submitSectionAttendance(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSubmissions'] });
      showToast(`Attendance for ${data.periodLabel || 'selected periods'} submitted successfully!`);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to submit attendance', true);
    },
  });

  const handleSubmit = () => {
    if (selectedPeriodIds.length === 0) {
      showToast('Please select at least one period before submitting.', true);
      return;
    }

    // Build complete record list for every student in the section
    const recordsPayload = currentRollNumbers.map(roll => {
      let status: 'present' | 'absent' = 'absent';
      const rawStatus = markedAttendance[roll];

      if (rawStatus) {
        status = rawStatus;
      } else if (permissionStudentsSet.has(roll)) {
        status = 'present';
      } else if (markMode === 'absent') {
        // If faculty operated in absentees mode, unmarked non-absent students default to present
        status = 'present';
      } else {
        // If faculty operated in presentees mode, unmarked students default to absent
        status = 'absent';
      }

      return { rollNumber: roll, status };
    });

    submitMutation.mutate({
      date: selectedDate,
      section: sectionFilter,
      year: selectedYear,
      periods: periodsKey,
      periodLabel: periodLabelString,
      records: recordsPayload,
    });
  };

  // Stats calculation
  const totalStudentsCount = currentRollNumbers.length;
  const presentCount = useMemo(() => Object.values(markedAttendance).filter(v => v === 'present').length, [markedAttendance]);
  const absentCount = useMemo(() => Object.values(markedAttendance).filter(v => v === 'absent').length, [markedAttendance]);
  const unmarkedCount = totalStudentsCount - (presentCount + absentCount);

  return (
    <PageWrapper role="faculty">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-white text-[13px] font-bold ${
                toastMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {toastMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{toastMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Page Header ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-0.5">
              Faculty Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
              Mark Section Attendance
            </h1>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Select class periods and mark student attendance for public verification
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-700">
              <Calendar size={14} className="text-orange-500 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* ── Year & Section Selector Container ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-3.5 shadow-xs">
          
          {/* Top Row: Year Selection (Square buttons with rounded corners) */}
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
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer ${
                    selectedYear === yr.value
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
                  {sectionFilter === 'CSD-A' ? 'CSD — Section A' : sectionFilter === 'CSIT-A' ? 'CSIT — Section A' : 'CSIT — Section B'}
                </span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

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
                  ].map(sec => (
                    <button
                      key={sec.value}
                      type="button"
                      onClick={() => {
                        setSectionFilter(sec.value);
                        setIsSectionDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[12px] font-bold flex items-center justify-between hover:bg-orange-50 transition-colors cursor-pointer ${
                        sectionFilter === sec.value ? 'text-orange-600 bg-orange-50/60' : 'text-slate-700'
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

          {/* ── 45-Minute Period Selection Grid ── */}
          <div className="pt-2.5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-orange-500" />
                Select Class Period(s) for Attendance:
              </span>
              <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {periodLabelString}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {PERIOD_SLOTS.map(slot => {
                const isSelected = selectedPeriodIds.includes(slot.id);
                // Check if this period slot is locked by another faculty member
                const subForSlot = existingSubmissions.find(s => {
                  const rawP: unknown = s.periods;
                  const pArr = typeof rawP === 'string'
                    ? rawP.split(',').map(n => Number(n.trim()))
                    : Array.isArray(rawP)
                    ? rawP.map((n: unknown) => Number(n))
                    : [Number(rawP)];
                  return pArr.includes(slot.id);
                });
                const currentUid = (user?.id || user?.userId || '').toLowerCase().trim();
                const currentUemail = (user?.email || '').toLowerCase().trim();
                const subUid = (subForSlot?.markedById || '').toLowerCase().trim();
                const subUemail = (subForSlot?.markedBy?.email || '').toLowerCase().trim();

                const isLocked = Boolean(
                  subForSlot &&
                  !(currentUid && subUid && currentUid === subUid) &&
                  !(currentUemail && subUemail && currentUemail === subUemail) &&
                  user?.role !== 'admin' &&
                  user?.role !== 'hod'
                );
                const lockedBy = isLocked ? subForSlot?.markedBy?.name || 'Faculty' : null;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={Boolean(isLocked)}
                    onClick={() => {
                      if (isLocked) {
                        showToast(`Period ${slot.id} is locked (Submitted by ${lockedBy}).`, true);
                        return;
                      }
                      togglePeriodSlot(slot.id);
                    }}
                    title={isLocked ? `Locked by ${lockedBy}` : slot.timeRange}
                    className={`px-3 py-2 rounded-xl border text-left flex flex-col justify-between transition-all select-none relative ${
                      isLocked
                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                        : isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm scale-[1.02] cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full font-bold">
                      <span className="flex items-center gap-1">
                        {slot.label}
                        {isLocked && <Lock size={11} className="text-amber-600" />}
                      </span>
                      {isSelected && !isLocked ? <Check size={14} /> : <span className="text-[9px] opacity-60">45m</span>}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${isLocked ? 'text-slate-400' : isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                      {isLocked ? `Locked (${lockedBy?.split(' ')[0]})` : slot.timeRange}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Lunch Break Note */}
            <div className="text-[10px] text-slate-400 font-medium text-center pt-0.5">
              🍱 Lunch Break: 12:00 PM – 01:30 PM
            </div>
          </div>
        </div>

        {/* ── Conditional Render: Require Year, Section & Period Numbers Selection ── */}
        {selectedPeriodIds.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center mx-auto shadow-xs">
              <Calendar size={24} />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Select Academic Year, Section & Period Numbers</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Student roll numbers and approved permissions will appear here once you select the required Year, Target Section, and Period number(s) above.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Approved Permission Notice Banner ── */}
            {permissionStudentsSet.size > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300/80 text-amber-900 rounded-xl text-[12px] font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>
                    {permissionStudentsSet.size} Student(s) have approved permissions for Period(s) {selectedPeriodIds.join(', ')} today (Pre-highlighted in 🟡 Yellow &amp; pre-set to Present).
                  </span>
                </div>
                <span className="text-[10.5px] bg-amber-200/80 px-2 py-0.5 rounded-md text-amber-950 font-black uppercase tracking-wider">
                  Auto-Protected
                </span>
              </div>
            )}

            {/* ── Submitter Ownership Warning / Status Badge ── */}
            {currentSubmission && (
              <div className={`p-3 rounded-xl border flex items-center justify-between text-[12px] font-bold ${
                isOwner
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2">
                  {isOwner ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Lock size={16} className="text-amber-600" />}
                  <span>
                    {isOwner
                      ? `Previously marked by you (${currentSubmission.markedBy?.name})`
                      : `Marked by ${currentSubmission.markedBy?.name} (${currentSubmission.markedBy?.department}) — Read Only`}
                  </span>
                </div>
                <span className="text-[11px] opacity-75 font-medium">
                  Submitted: {new Date(currentSubmission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* ── Grid Container & Interactive Marking Controls ── */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-xs">
              
              {/* Click Mode Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    Click Mode:
                  </span>
                  <div className="flex items-center gap-2">
                    <label className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all text-[12px] font-bold ${
                      markMode === 'present'
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}>
                      <input
                        type="radio"
                        name="markMode"
                        checked={markMode === 'present'}
                        onChange={() => setMarkMode('present')}
                        className="sr-only"
                      />
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${markMode === 'present' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'}`} />
                      <span>Presentees</span>
                    </label>

                    <label className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all text-[12px] font-bold ${
                      markMode === 'absent'
                        ? 'bg-rose-50/80 border-rose-300 text-rose-900 shadow-2xs ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}>
                      <input
                        type="radio"
                        name="markMode"
                        checked={markMode === 'absent'}
                        onChange={() => setMarkMode('absent')}
                        className="sr-only"
                      />
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${markMode === 'absent' ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : 'bg-slate-400'}`} />
                      <span>Absentees</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Quick Counter Summary */}
              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span>Total: <strong className="text-slate-900">{totalStudentsCount}</strong></span>
                <span className="text-emerald-700">Present: <strong>{presentCount}</strong></span>
                <span className="text-rose-700">Absent: <strong>{absentCount}</strong></span>
                <span className="text-slate-400">Unmarked: <strong>{unmarkedCount}</strong></span>
              </div>

              {/* Stationary Icon-App Launcher Grid */}
              <div className="max-w-[820px] mx-auto pt-2 pb-2">
                <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 justify-items-center">
                  {currentRollNumbers.map(roll => {
                    const rawStatus = markedAttendance[roll];
                    const hasPermission = permissionStudentsSet.has(roll);

                    let effectiveStatus = rawStatus;
                    if (!rawStatus) {
                      if (hasPermission) {
                        effectiveStatus = 'present';
                      } else if (Object.keys(markedAttendance).length > 0) {
                        if (markMode === 'present') {
                          effectiveStatus = 'absent';
                        } else if (markMode === 'absent') {
                          effectiveStatus = 'present';
                        }
                      }
                    }

                    let btnStyle = 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-200/80';
                    if (hasPermission && rawStatus !== 'absent') {
                      // Yellow Approved Permission — ALWAYS marked Yellow for approved permission students (unless explicitly marked absent)
                      btnStyle = 'bg-[#FDE047] text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/80 font-black scale-[1.02]';
                    } else if (effectiveStatus === 'present') {
                      btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20 scale-[1.02] font-extrabold';
                    } else if (effectiveStatus === 'absent') {
                      btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20 scale-[1.02] font-extrabold';
                    }

                    return (
                      <button
                        key={roll}
                        type="button"
                        onClick={() => handleRollClick(roll)}
                        disabled={!isOwner}
                        title={hasPermission ? `Roll #${roll}: Has Approved Out-Pass Permission` : `Roll #${roll}`}
                        className={`w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-2xl border flex flex-col items-center justify-center text-[13px] font-bold transition-all cursor-pointer select-none relative ${btnStyle} ${
                          !isOwner ? 'cursor-not-allowed opacity-90' : ''
                        }`}
                      >
                        {hasPermission && (
                          <span className="absolute -top-1 px-1 py-0.2 bg-amber-500 text-white text-[7px] font-black rounded-full uppercase shadow-2xs">
                            PERM
                          </span>
                        )}
                        <span>{roll}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Submit / Update Attendance Button (Positioned at the bottom of the numbers list) ── */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  disabled={!isOwner || submitMutation.isPending}
                  onClick={handleSubmit}
                  className={`w-full sm:w-auto min-w-[260px] py-3 px-6 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
                    !isOwner
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : submitMutation.isPending
                      ? 'bg-orange-400 text-white cursor-wait'
                      : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-orange-500/25 ring-2 ring-orange-500/20'
                  }`}
                >
                  {submitMutation.isPending ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>
                    {currentSubmission ? 'Update Attendance' : 'Submit Attendance'}
                  </span>
                </button>
              </div>

            </div>
          </>
        )}

      </div>
    </PageWrapper>
  );
}
