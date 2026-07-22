import { cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  role?: 'student' | 'faculty' | 'hod';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-16 h-16 text-[20px]',
};

const roleGradientMap = {
  student: 'from-navy-500 to-navy-400',
  faculty: 'from-teal-500 to-teal-400',
  hod: 'from-maroon-500 to-maroon-400',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getGradient(name: string): string {
  const gradients = [
    'from-navy-500 to-navy-400',
    'from-teal-500 to-teal-400',
    'from-maroon-500 to-maroon-400',
    'from-navy-600 to-teal-500',
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
}

export function Avatar({ name, size = 'md', role, className }: AvatarProps) {
  const gradient = role ? roleGradientMap[role] : getGradient(name);
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br text-white shadow-sm',
        sizeMap[size],
        gradient,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
