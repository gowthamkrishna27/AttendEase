import { cn } from '../../lib/utils';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus;
  finalDecisionBy?: string;
  finalDecisionName?: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; dot: string; className: string }> = {
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500',
    className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  },
  approved: {
    label: 'Approved',
    dot: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-rose-500',
    className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-600 border border-slate-200/60',
  },
};

export function StatusBadge({ status, finalDecisionBy, finalDecisionName, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['pending'];
  const isHOD = finalDecisionBy === 'HOD';
  const approverLabel = finalDecisionName || (isHOD ? 'HOD' : 'Faculty');

  if (status === 'approved') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold tracking-wide whitespace-nowrap shrink-0',
          isHOD
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isHOD ? 'bg-emerald-600 animate-pulse' : 'bg-emerald-600')} />
        <span className="truncate max-w-[130px] sm:max-w-[220px]">Approved ({approverLabel})</span>
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold tracking-wide whitespace-nowrap shrink-0 bg-rose-50 text-rose-800 border border-rose-200/80',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-rose-600" />
        <span className="truncate max-w-[130px] sm:max-w-[220px]">Rejected ({approverLabel})</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold tracking-wide whitespace-nowrap shrink-0',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}
