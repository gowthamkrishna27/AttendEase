import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface LoginLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accentColor?: string;
}

export function LoginLayout({
  children,
  title,
  subtitle,
  icon,
  accentColor = 'bg-[#111111]',
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
      {/* Back */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-7 h-7 bg-[#111111] rounded-lg flex items-center justify-center">
          <span className="text-white text-[11px] font-bold">AE</span>
        </div>
        <span className="text-[16px] font-semibold text-[#111111]">AttendEase</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className={`w-14 h-14 rounded-2xl ${accentColor} flex items-center justify-center mb-4`}
          >
            {icon}
          </div>
          <h1 className="text-[24px] font-bold text-[#111111]">{title}</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">{subtitle}</p>
        </div>

        {/* Form card */}
        <div className="card p-6">{children}</div>
      </motion.div>
    </div>
  );
}
