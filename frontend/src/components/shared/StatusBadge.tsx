import { cn } from '../../lib/utils';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus;
  finalDecisionBy?: string;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; dot: string; className: string }> = {
  pending: {
    label: 'Pending',
    dot: 'bg-warning',
    className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  },
  approved: {
    label: 'Approved',
    dot: 'bg-success',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-danger',
    className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  },
};

export function StatusBadge({ status, finalDecisionBy, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const isHOD = finalDecisionBy === 'HOD';

  if (isHOD && status === 'approved') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-purple-600 animate-pulse" />
        Approved (HOD)
      </span>
    );
  }

  if (isHOD && status === 'rejected') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide bg-rose-50 text-rose-800 border border-rose-200/80',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-rose-600" />
        Rejected (HOD)
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}
