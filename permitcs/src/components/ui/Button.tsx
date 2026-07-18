import { motion } from 'framer-motion';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantMap = {
  primary: 'bg-[#111111] text-white hover:bg-[#222222] disabled:bg-[#6B7280]',
  secondary: 'bg-white text-[#111111] border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:text-[#6B7280]',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111111]',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-[13px] rounded-xl',
  md: 'px-4 py-2.5 text-[14px] rounded-xl',
  lg: 'px-6 py-3 text-[15px] rounded-2xl',
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
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2',
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
