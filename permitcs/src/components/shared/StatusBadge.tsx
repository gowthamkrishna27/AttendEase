import { cn } from '../../lib/utils';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border border-warning/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success border border-success/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-danger/10 text-danger border border-danger/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
