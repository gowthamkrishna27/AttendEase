import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  CheckSquare, ArrowRight, Bell, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight
} from 'lucide-react';

import { CheckSquare, ArrowRight } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { FaceAlignedImage } from '../../components/shared/FaceAlignedImage';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });


  const recentRequests = requestsList.slice(0, 5);

  const total = requestsList.length;
  const pending = requestsList.filter((r: AttendanceRequest) => r.status === 'pending').length;
  const approved = requestsList.filter((r: AttendanceRequest) => r.status === 'approved').length;
  const rejected = requestsList.filter((r: AttendanceRequest) => r.status === 'rejected').length;


  return (
    <PageWrapper role="faculty">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Faculty Profile Banner (Pixel-perfect posture on both mobile & desktop) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-slate-200/80 rounded-[22px] overflow-hidden shadow-xs"
        >
          <div className="flex flex-row items-center p-4 sm:p-5 gap-4 sm:gap-6">
            {/* Photo – face-detected & auto-aligned thumbnail */}
            <div className="w-24 h-28 sm:w-44 sm:h-52 rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 shadow-inner">
              <FaceAlignedImage
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Faculty')}&background=F97316&color=fff&size=240`}
                alt={user?.name || 'Faculty Profile'}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Faculty')}&background=F97316&color=fff&size=240`;
                }}
              />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
              <p className="text-[10px] sm:text-[11px] font-extrabold text-orange-500 uppercase tracking-widest">
                FACULTY OVERVIEW
              </p>
              <h1 className="text-base sm:text-2xl font-heading font-extrabold text-slate-900 leading-tight truncate">
                {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Professor</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[12px] font-bold rounded-full bg-orange-50 text-orange-600 border border-orange-200/80">
                  {user?.department ?? 'CSIT'}
                </span>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[12px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 truncate max-w-[150px] sm:max-w-none">
                  SRKR Engineering College
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate pt-1">{user?.email}</p>
            </div>
          </div>
        </motion.div>


        {/* ── Prominent Full-Width "Take Attendance" Action Card ── */}

        {/* ── Take Attendance Primary Action Card (Between Overview & Stats) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 sm:mb-8"
        >
          <div
            className="p-4 sm:p-5 rounded-2xl sm:rounded-[22px] flex items-center justify-between gap-3 shadow-lg shadow-orange-500/20"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
                <CheckSquare size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px] uppercase tracking-wider inline-block mb-1 border border-white/20">
                  PRIMARY ACTION
                </span>
                <h3 className="text-[17px] sm:text-[19px] font-extrabold text-white leading-tight truncate">
                  Take Attendance
                </h3>
                <p className="text-[12px] text-orange-100 font-medium truncate">
                  Select section, period block, and...
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/faculty/attendance')}
              className="px-4 sm:px-5 py-2 bg-white hover:bg-orange-50 text-orange-600 font-extrabold text-[13px] rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Open Roster</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        {/* ── Summary Stats ── */}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={() => navigate('/faculty/attendance')}
          className="group relative overflow-hidden bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] text-white rounded-[22px] p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-orange-400/40"
        >
          <div className="absolute right-0 top-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10 flex flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <CheckSquare size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <div className="inline-block">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                    PRIMARY ACTION
                  </span>
                </div>
                <h2 className="text-sm sm:text-xl font-heading font-extrabold text-white leading-tight truncate">
                  Take Attendance
                </h2>
                <p className="text-[10.5px] sm:text-xs text-orange-100 font-medium line-clamp-1">
                  Select section, period block, and mark student attendance for today's classes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white text-orange-600 font-extrabold text-xs sm:text-sm px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm shrink-0 whitespace-nowrap hover:bg-orange-50 transition-colors">
              <span>Open Roster</span>
              <ArrowRight size={14} className="sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>

        {/* ── Recent Request Notifications Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="bg-white border border-slate-200/80 rounded-[22px] p-4 sm:p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 leading-snug truncate">
                  Recent Request Notifications
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Latest student permission and leave passes submitted to your department
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/faculty/requests')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 hover:underline cursor-pointer shrink-0 ml-2"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Request List or Empty State */}
          {recentRequests.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentRequests.map((req: AttendanceRequest) => {
                const studentName = req.student?.name || 'Student';
                const rollNo = req.student?.rollNumber || req.studentId || '';
                const reasonLabel = req.reasonLabel || req.reason || 'Permission';

                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} /> Pending
                  </span>
                );
                if (req.status === 'approved') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  );
                } else if (req.status === 'rejected') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle size={12} /> Rejected
                    </span>
                  );
                }

                return (
                  <div
                    key={req.id}
                    onClick={() => navigate('/faculty/requests')}
                    className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {rollNo.slice(-2) || 'ST'}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{studentName}</span>
                          {rollNo && (
                            <span className="text-[11px] font-semibold text-slate-400">({rollNo})</span>
                          )}
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600">
                            {reasonLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Date: <strong className="text-slate-700">{req.date}</strong>
                          {req.periods ? ` • Periods: ${req.periods}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {statusBadge}
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100/80 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/60">
                <AlertCircle size={20} />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700">No recent request notifications</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                When students submit permission or leave passes for your department, they will appear here.
              </p>
            </div>
          )}
        </motion.div>


      </div>
    </PageWrapper>
  );
}
