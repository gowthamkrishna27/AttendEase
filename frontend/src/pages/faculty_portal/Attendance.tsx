import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([1]);

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
  const { data: existingSubmissions = [], isLoading: isFetchingSubmissions } = useQuery<AttendanceSubmissionItem[]>({
    queryKey: ['attendanceSubmissions', selectedDate, sectionFilter, selectedYear],
    queryFn: () => api.getAttendanceSubmissions(selectedDate, sectionFilter, selectedYear),
  });

  // Find submission matching current selected periods
  const currentSubmission = useMemo(() => {
    return existingSubmissions.find(sub => sub.periods === periodsKey);
  }, [existingSubmissions, periodsKey]);

  // Check ownership
  const isOwner = useMemo(() => {
    if (!currentSubmission) return true;
    return currentSubmission.markedById === user?.userId || user?.role === 'admin';
  }, [currentSubmission, user]);

  // Populate grid when switching periods/date/section if a submission exists
  useEffect(() => {
    if (currentSubmission && currentSubmission.records) {
      const initialMap: Record<string, 'present' | 'absent'> = {};
      currentSubmission.records.forEach(rec => {
        initialMap[rec.rollNumber] = rec.status as 'present' | 'absent';
      });
      setMarkedAttendance(initialMap);
    } else {
      setMarkedAttendance({});
    }
  }, [currentSubmission]);

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

    const recordsPayload = Object.entries(markedAttendance).map(([rollNumber, status]) => ({
      rollNumber,
      status,
    }));

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

        {/* ── Section & Year Selector Container ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
          
          {/* Top Row: Full-width Section Dropdown Bar */}
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

          {/* Year Buttons Row */}
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
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => togglePeriodSlot(slot.id)}
                    className={`px-3 py-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm scale-[1.02]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full font-bold">
                      <span>{slot.label}</span>
                      {isSelected ? <Check size={14} /> : <span className="text-[9px] opacity-60">45m</span>}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                      {slot.timeRange}
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
          
          {/* Click Mode Controls & Submit Button Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                Click Mode:
              </span>
              <div className="flex items-center gap-2">
                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                  markMode === 'present'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="markMode"
                    checked={markMode === 'present'}
                    onChange={() => setMarkMode('present')}
                    className="sr-only"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Presentees 🟢</span>
                </label>

                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                  markMode === 'absent'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="markMode"
                    checked={markMode === 'absent'}
                    onChange={() => setMarkMode('absent')}
                    className="sr-only"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>Absentees 🔴</span>
                </label>
              </div>
            </div>

            {/* Submit / Update Button */}
            <button
              type="button"
              disabled={!isOwner || submitMutation.isPending}
              onClick={handleSubmit}
              className={`px-5 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                !isOwner
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : submitMutation.isPending
                  ? 'bg-orange-400 text-white cursor-wait'
                  : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-orange-500/20'
              }`}
            >
              {submitMutation.isPending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>
                {currentSubmission ? 'Update Attendance' : 'Submit Attendance'}
              </span>
            </button>
          </div>

          {/* Quick Counter Summary */}
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span>Total: <strong className="text-slate-900">{totalStudentsCount}</strong></span>
            <span className="text-emerald-700">Present: <strong>{presentCount}</strong></span>
            <span className="text-rose-700">Absent: <strong>{absentCount}</strong></span>
            <span className="text-slate-400">Unmarked: <strong>{unmarkedCount}</strong></span>
          </div>

          {/* Stationary Icon-App Launcher Grid */}
          <div className="max-w-[820px] mx-auto pt-2">
            <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 justify-items-center">
              {currentRollNumbers.map(roll => {
                const status = markedAttendance[roll];

                let btnStyle = 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-200/80';
                if (status === 'present') {
                  btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20 scale-[1.02] font-extrabold';
                } else if (status === 'absent') {
                  btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20 scale-[1.02] font-extrabold';
                }

                return (
                  <button
                    key={roll}
                    type="button"
                    onClick={() => handleRollClick(roll)}
                    disabled={!isOwner}
                    className={`w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-2xl border flex items-center justify-center text-[13px] font-bold transition-all cursor-pointer select-none ${btnStyle} ${
                      !isOwner ? 'cursor-not-allowed opacity-90' : ''
                    }`}
                  >
                    {roll}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
