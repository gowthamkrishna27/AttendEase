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
    dot: 'bg-slate-900',
    className: 'bg-slate-100 text-slate-900 border border-slate-200/80 font-bold',
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

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['pending'];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold tracking-wide whitespace-nowrap shrink-0',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      <span>{config.label}</span>
    </span>
  );
}
