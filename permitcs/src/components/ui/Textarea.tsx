import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[14px] font-medium text-[#111111]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={5}
          className={cn(
            'w-full px-4 py-3 text-[15px] text-[#111111] bg-white border rounded-xl outline-none transition-all duration-150 resize-none',
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

Textarea.displayName = 'Textarea';
