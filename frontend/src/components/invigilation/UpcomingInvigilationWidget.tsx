import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  MapPin,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  formatDate,
  listInvigilationAssignmentsForFaculty,
  type InvigilationAssignment,
} from '../../lib/invigilationApi';

interface UpcomingInvigilationWidgetProps {
  /** Faculty userId to fetch duties for. */
  facultyId: string;
  /** When true, override the internal loading state (e.g. parent already has the data). */
  isLoading?: boolean;
  /** When set, override the internal error state. */
  error?: string | null;
  /** Maximum number of duties to show. Defaults to 3. */
  maxItems?: number;
}

export function UpcomingInvigilationWidget({
  facultyId,
  isLoading: isLoadingProp,
  error: errorProp,
  maxItems = 3,
}: UpcomingInvigilationWidgetProps) {
  const [assignments, setAssignments] = useState<InvigilationAssignment[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!facultyId) {
      setAssignments([]);
      setInternalLoading(false);
      return;
    }
    let cancelled = false;
    setInternalLoading(true);
    setInternalError(null);
    listInvigilationAssignmentsForFaculty(facultyId)
      .then(list => {
        if (!cancelled) setAssignments(list);
      })
      .catch(err => {
        if (!cancelled) setInternalError(err?.message || 'Failed to load upcoming invigilation duties.');
      })
      .finally(() => {
        if (!cancelled) setInternalLoading(false);
      });
    return () => { cancelled = true; };
  }, [facultyId]);

  const isLoading = isLoadingProp ?? internalLoading;
  const error = errorProp ?? internalError;

  // Sort ascending by date+time, then keep the next N
  const visible = [...assignments]
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .slice(0, maxItems);
  const hasMore = assignments.length > maxItems;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
      className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <ClipboardList size={11} /> Upcoming Duties
          </p>
          <h2 className="text-[16px] sm:text-[18px] font-heading font-bold text-slate-900 leading-tight mt-0.5 truncate">
            Invigilation Schedule
          </h2>
        </div>
        {!isLoading && !error && (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-bold border border-slate-200 shrink-0">
            {assignments.length} {assignments.length === 1 ? 'duty' : 'duties'}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2.5">
          {Array.from({ length: Math.min(maxItems, 3) }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-pulse"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 bg-slate-200 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-slate-400 flex items-center justify-center gap-1.5 py-1">
            <Loader2 size={12} className="animate-spin" /> Loading your duties…
          </p>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-rose-900">Couldn't load duties</p>
            <p className="text-[11.5px] text-rose-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-[14px] font-bold text-slate-900">No duties scheduled</p>
          <p className="text-[12px] text-slate-500 mt-0.5 max-w-xs">
            You're all clear. New invigilation duties will appear here once assigned by the admin.
          </p>
        </div>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <div className="space-y-2.5">
          {visible.map(a => {
            const isOtherDuty = a.type === 'Other Duties';
            const typeLabel = isOtherDuty && a.otherDutyDescription
              ? a.otherDutyDescription
              : `${a.type} Invigilation`;
            const locationBits = [a.roomNo, a.block].filter(Boolean);
            const location = locationBits.length > 0 ? locationBits.join(' · ') : null;
            return (
              <div
                key={a.id}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-bold text-slate-900 truncate">
                        {typeLabel}
                      </p>
                      <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        {a.branch}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-[11.5px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={11} className="text-slate-400 shrink-0" />
                        {formatDate(a.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        {a.startTime} – {a.endTime}
                      </span>
                      <span className="inline-flex items-center gap-1 sm:col-span-2">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        {location ?? (
                          <span className="text-slate-400 italic">Room & block not assigned</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <p className="text-[11.5px] text-slate-400 text-center pt-1">
              +{assignments.length - maxItems} more duty{assignments.length - maxItems === 1 ? '' : 'ies'} scheduled
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
