import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Clock, MapPin, Building, BookOpen,
  AlertCircle, RotateCcw, Loader2, Sparkles, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import {
  formatKolkataDate,
  formatKolkataTime,
  fromIsoToKolkataInputs
} from '../../../lib/utils';

// Helper to format countdown or relative starting time
function formatTimeUntilStart(diffMs: number, startIso: string): string {
  if (diffMs <= 0) return 'Starting now';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 1) {
    return `Starts in ${minutes} min${minutes === 1 ? '' : 's'}`;
  }
  if (hours < 12) {
    return minutes > 0 ? `Starts in ${hours}h ${minutes}m` : `Starts in ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  // Check if it's today in IST
  const todayIST = fromIsoToKolkataInputs(new Date().toISOString()).date;
  const dutyDateIST = fromIsoToKolkataInputs(startIso).date;

  if (todayIST === dutyDateIST) {
    return `Today at ${formatKolkataTime(startIso)}`;
  }

  return `Starts ${formatKolkataDate(startIso)} at ${formatKolkataTime(startIso)}`;
}

// Exam Type Badge helper
function ExamTypeBadge({ type }: { type: api.ExamType }) {
  const styles: Record<api.ExamType, { label: string; bg: string; text: string; border: string }> = {
    MID: { label: 'MID EXAM', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    SEM: { label: 'SEMESTER', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    LAB: { label: 'LAB EXAM', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    SUPPLEMENTARY: { label: 'SUPPLEMENTARY', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  const style = styles[type] || { label: type, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wider uppercase border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

export function UpcomingInvigilationWidget() {
  // Local timer state for live countdown and status recalculation
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Refresh local time every 30 seconds
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch only authenticated faculty's duties from backend endpoint
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['faculty-invigilation-duties'],
    queryFn: () => api.getMyInvigilationDuties(),
    staleTime: 60000,
  });

  const rawDuties = data?.duties || [];

  // Calculate dynamic status and sort:
  // 1. IN_PROGRESS duties first
  // 2. Upcoming duties by nearest startDateTime ascending
  // Exclude completed duties (now > endMs)
  const processedDuties = useMemo(() => {
    const active = rawDuties
      .map((duty) => {
        const startMs = new Date(duty.startDateTime).getTime();
        const endMs = new Date(duty.endDateTime).getTime();
        const isInProgress = startMs <= now && now <= endMs;
        const isCompleted = now > endMs;
        const diffMs = startMs - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        return {
          ...duty,
          startMs,
          endMs,
          isInProgress,
          isCompleted,
          diffMs,
          diffHours,
        };
      })
      .filter((d) => !d.isCompleted);

    active.sort((a, b) => {
      if (a.isInProgress && !b.isInProgress) return -1;
      if (!a.isInProgress && b.isInProgress) return 1;
      return a.startMs - b.startMs;
    });

    return active;
  }, [rawDuties, now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 }}
      className="mb-6 sm:mb-8"
    >
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* ── Widget Header ── */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EA580C] border border-orange-100 flex items-center justify-center shrink-0">
              <CalendarCheck size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Upcoming Invigilation Duties</span>
                {processedDuties.length > 0 && (
                  <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.2 rounded-full">
                    {processedDuties.length} {processedDuties.length === 1 ? 'duty' : 'duties'}
                  </span>
                )}
              </h2>
              <p className="text-[11.5px] text-slate-400 font-medium">
                Assigned exam duties (Asia/Kolkata)
              </p>
            </div>
          </div>

          {isFetching && !isLoading && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Loader2 size={12} className="animate-spin text-orange-500" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="py-6 flex flex-col items-center justify-center gap-2.5 bg-slate-50/50 rounded-xl border border-slate-100 text-slate-400 text-xs">
            <Loader2 size={20} className="animate-spin text-[#EA580C]" />
            <span>Loading assigned invigilation duties...</span>
          </div>
        )}

        {/* ── Error State (Non-disruptive) ── */}
        {isError && !isLoading && (
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>
                {error instanceof Error ? error.message : 'Unable to load invigilation duties.'}
              </span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded text-[11px] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw size={11} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ── Empty State ── */}
        {!isLoading && !isError && processedDuties.length === 0 && (
          <div className="py-5 px-4 bg-slate-50/60 rounded-xl border border-slate-200/60 flex items-center justify-center gap-2.5 text-center">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="text-[13px] font-medium text-slate-600">
              No upcoming invigilation duties
            </span>
          </div>
        )}

        {/* ── Duties List / Cards ── */}
        {!isLoading && !isError && processedDuties.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {processedDuties.map((duty) => {
                const dateStr = formatKolkataDate(duty.startDateTime);
                const startStr = formatKolkataTime(duty.startDateTime);
                const endStr = formatKolkataTime(duty.endDateTime);

                // Urgency Calculation:
                // IN PROGRESS:
                // - border: border-l-emerald-500
                // - badge: green "In Progress"
                // UPCOMING:
                // - diffHours <= 16: RED urgency (border-l-rose-500)
                // - 16 < diffHours <= 24: YELLOW urgency (border-l-amber-500)
                // - diffHours > 24: GREEN urgency (border-l-emerald-500)
                let borderAccent = 'border-l-emerald-500';
                let urgencyBadge = null;

                if (duty.isInProgress) {
                  borderAccent = 'border-l-emerald-500 bg-emerald-50/15';
                  urgencyBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>In Progress</span>
                      <span className="font-normal text-emerald-600/90 text-[10.5px]">
                        • Ends at {endStr}
                      </span>
                    </span>
                  );
                } else if (duty.diffHours <= 16) {
                  // RED urgency
                  borderAccent = 'border-l-rose-500';
                  urgencyBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Clock size={12} className="text-rose-500" />
                      <span>{formatTimeUntilStart(duty.diffMs, duty.startDateTime)}</span>
                    </span>
                  );
                } else if (duty.diffHours <= 24) {
                  // YELLOW urgency
                  borderAccent = 'border-l-amber-500';
                  urgencyBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock size={12} className="text-amber-600" />
                      <span>{formatTimeUntilStart(duty.diffMs, duty.startDateTime)}</span>
                    </span>
                  );
                } else {
                  // GREEN urgency
                  borderAccent = 'border-l-emerald-500';
                  urgencyBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Clock size={12} className="text-slate-500" />
                      <span>{formatTimeUntilStart(duty.diffMs, duty.startDateTime)}</span>
                    </span>
                  );
                }

                return (
                  <motion.div
                    key={duty.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 rounded-xl border border-slate-200/90 border-l-[4.5px] ${borderAccent} bg-white shadow-2xs hover:border-slate-300 transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      {/* Left: Exam, Subject, Duty Role */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ExamTypeBadge type={duty.examType} />
                          {duty.dutyType && (
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {duty.dutyType}
                            </span>
                          )}
                        </div>

                        <h3 className="text-[14.5px] sm:text-[15px] font-bold text-slate-900 leading-snug">
                          {duty.examName}
                        </h3>

                        <div className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <span>{duty.subjectName}</span>
                        </div>
                      </div>

                      {/* Right: Urgency / Countdown Badge */}
                      <div className="shrink-0 self-start">
                        {urgencyBadge}
                      </div>
                    </div>

                    {/* Duty Metadata Footer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[12px]">
                      {/* Date & Time */}
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock size={13.5} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900">{dateStr}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{startStr} – {endStr}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building size={13.5} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{duty.blockName}</span>
                        <span className="text-slate-400">•</span>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">Room {duty.roomNumber}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </motion.div>
  );
}
