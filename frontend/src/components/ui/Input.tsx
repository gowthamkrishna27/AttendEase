import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 text-[14px] text-slate-900 bg-white border rounded-xl outline-none transition-all duration-150 shadow-inner',
            'placeholder:text-slate-300',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-slate-200 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/12',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[12px] text-slate-400">{hint}</p>}
        {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
