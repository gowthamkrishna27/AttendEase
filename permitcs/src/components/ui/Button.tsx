import { motion } from 'framer-motion';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'teal' | 'maroon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantMap = {
  primary: 'bg-gradient-to-br from-navy-500 to-navy-600 text-white shadow-[0_2px_8px_rgba(27,58,140,0.35)] hover:shadow-[0_4px_16px_rgba(27,58,140,0.4)] hover:from-navy-600 hover:to-navy-700 disabled:opacity-60',
  secondary: 'bg-white text-navy-500 border border-navy-500/20 hover:border-navy-500/40 hover:bg-navy-50 disabled:opacity-60',
  danger: 'bg-gradient-to-br from-maroon-500 to-maroon-600 text-white shadow-[0_2px_8px_rgba(139,26,46,0.3)] hover:shadow-[0_4px_16px_rgba(139,26,46,0.35)] hover:from-maroon-600 hover:to-maroon-700 disabled:opacity-60',
  ghost: 'bg-transparent text-slate-500 hover:bg-navy-50 hover:text-navy-500',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-[0_2px_8px_rgba(8,145,178,0.35)] hover:from-teal-600 hover:to-teal-700 disabled:opacity-60',
  maroon: 'bg-gradient-to-br from-maroon-500 to-maroon-600 text-white shadow-[0_2px_8px_rgba(139,26,46,0.3)] hover:from-maroon-600 hover:to-maroon-700 disabled:opacity-60',
};

const sizeMap = {
  sm: 'px-3.5 py-1.5 text-[13px] rounded-xl gap-1.5',
  md: 'px-4.5 py-2.5 text-[14px] rounded-xl gap-2',
  lg: 'px-6 py-3 text-[15px] rounded-2xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02, y: disabled || loading ? 0 : -1 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98, y: 0 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
        variantMap[variant],
        sizeMap[size],
        fullWidth && 'w-full',
        className
      )}
      {...(props as any)}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
}
