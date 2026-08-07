import { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  rollNumber?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  role?: 'student' | 'faculty' | 'hod' | 'admin';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-14 h-14 text-[18px]',
  xl: 'w-20 h-20 text-[24px]',
};

const roleGradientMap: Record<string, string> = {
  student: 'from-orange-500 to-amber-500',
  faculty: 'from-slate-800 to-slate-900',
  hod: 'from-orange-600 to-orange-700',
  admin: 'from-slate-900 to-black',
};

function getInitials(name: string): string {
  if (!name) return 'S';
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getGradient(name: string): string {
  const gradients = [
    'from-orange-500 to-amber-500',
    'from-slate-800 to-slate-950',
    'from-orange-600 to-orange-700',
    'from-slate-900 to-black',
  ];
  const index = (name || 'S').charCodeAt(0) % gradients.length;
  return gradients[index];
}

export function Avatar({ name, src, rollNumber, size = 'md', role, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const effectiveSrc = src || (rollNumber ? `https://srkrexams.in/SRKR/photo/${rollNumber.toUpperCase()}.jpg` : undefined);
  const gradient = role ? (roleGradientMap[role] || getGradient(name)) : getGradient(name);

  if (effectiveSrc && !imgError) {
    return (
      <div
        className={cn(
          'rounded-2xl flex-shrink-0 overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm',
          sizeMap[size],
          className,
        )}
      >
        <img
          src={effectiveSrc}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br text-white shadow-sm border border-black/5',
        sizeMap[size],
        gradient,
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
