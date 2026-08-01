import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, Users, BarChart2, Settings } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { FaceAlignedImage } from '../../components/shared/FaceAlignedImage';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.07 } }),
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  const total = requestsList.length;
  const pending = requestsList.filter((r: AttendanceRequest) => r.status === 'pending').length;
  const approved = requestsList.filter((r: AttendanceRequest) => r.status === 'approved').length;
  const rejected = requestsList.filter((r: AttendanceRequest) => r.status === 'rejected').length;

  const quickLinks = [
    { label: 'Requests', desc: 'Review student requests', icon: ClipboardList, to: '/faculty/requests', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Students', desc: 'View student submissions', icon: Users, to: '/faculty/students', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Reports', desc: 'Attendance analytics', icon: BarChart2, to: '/faculty/reports', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Settings', desc: 'Profile & preferences', icon: Settings, to: '/faculty/settings', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
  ];

  return (
    <PageWrapper role="faculty">
      <div className="max-w-4xl mx-auto">

        {/* ── Faculty Profile Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card overflow-hidden mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Photo – face-detected & auto-aligned */}
            <FaceAlignedImage
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Faculty')}&background=F97316&color=fff&size=240`}
              alt={user?.name || 'Faculty Profile'}
              containerClassName="sm:w-48 w-full h-[350px] sm:h-[256px] flex-shrink-0"
              className="w-full h-full object-cover object-top sm:absolute sm:inset-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Faculty')}&background=F97316&color=fff&size=240`;
              }}
            />
            {/* Info */}
            <div className="flex-1 p-5 sm:px-6 sm:py-5 flex flex-col justify-center">
              <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">
                FACULTY OVERVIEW
              </p>
              <p className="text-[20px] sm:text-[22px] font-heading font-bold text-slate-900 mb-0.5">{user?.name}</p>
              <p className="text-[13px] sm:text-[14px] text-slate-500 mb-3">Professor</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  {user?.department ?? 'CSD'}
                </span>
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  SRKR Engineering College
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-slate-400 mt-2.5">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Summary Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {[
            { label: 'Total', value: total, color: 'text-slate-700', bg: 'bg-white' },
            { label: 'Pending', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', value: approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rejected', value: rejected, color: 'text-rose-500', bg: 'bg-rose-50' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`card px-5 py-4 ${s.bg}`}
            >
              <p className={`text-[30px] font-heading font-bold leading-none mb-1 ${s.color}`}>{s.value}</p>
              <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Quick Navigation (Desktop Only) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="hidden sm:block"
        >
          <h2 className="text-[15px] font-heading font-bold text-slate-700 mb-3">Quick Navigation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {quickLinks.map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.button
                  key={link.label}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => navigate(link.to)}
                  className={`card px-4 py-5 flex flex-col items-start gap-3 border ${link.border} hover:shadow-md transition-shadow text-left cursor-pointer`}
                >
                  <div className={`w-10 h-10 rounded-xl ${link.bg} flex items-center justify-center`}>
                    <Icon size={20} className={link.color} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900">{link.label}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{link.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
