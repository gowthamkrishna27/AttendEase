import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-2.5 text-[14px] text-slate-900 bg-white border rounded-xl outline-none appearance-none transition-all duration-150 cursor-pointer shadow-inner',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                : 'border-slate-200 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/12',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
        {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
