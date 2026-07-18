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
          <label htmlFor={inputId} className="text-[14px] font-medium text-[#111111]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 text-[15px] text-[#111111] bg-white border rounded-xl outline-none transition-all duration-150',
            'placeholder:text-[#9CA3AF]',
            error
              ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger/20'
              : 'border-[#E5E7EB] focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[13px] text-[#6B7280]">{hint}</p>}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
