import { motion } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Users, BarChart2, Settings, ArrowRight,
  Clock, CheckCircle, XCircle, ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Avatar } from '../../components/shared/Avatar';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/utils';
import type { AttendanceRequest } from '../../types';

export default function HODDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requestsList = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    refetchInterval: 5000,
  });

  const pendingCount = requestsList.filter((r: AttendanceRequest) => r.status === 'pending').length;
  const approvedCount = requestsList.filter((r: AttendanceRequest) => r.status === 'approved').length;
  const rejectedCount = requestsList.filter((r: AttendanceRequest) => r.status === 'rejected').length;

  const quickLinks = [
    { label: 'All Requests', description: 'Review & manage student permission requests', icon: ClipboardList, to: '/hod/requests', color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
    { label: 'Faculty Directory', description: 'View department faculty members & workloads', icon: Users, to: '/hod/faculty', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Analytics Reports', description: 'Department-wide attendance permission metrics', icon: BarChart2, to: '/hod/reports', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: 'Portal Settings', description: 'Manage department preferences & settings', icon: Settings, to: '/hod/settings', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  ];

  const recentRequests = requestsList.slice(0, 5);

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">

        {/* ── HOD Profile Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card overflow-hidden"
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #EEF2F7',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Photo */}
            <div className="sm:w-48 w-full h-64 sm:h-auto flex-shrink-0 bg-slate-100 overflow-hidden relative">
              <img
                src={
                  user?.avatarUrl ??
                  (user?.department === 'CSIT'
                    ? 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg'
                    : 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg')
                }
                alt="HOD Profile"
                className="w-full h-full object-cover object-top"
              />
            </div>
            {/* Info */}
            <div className="flex-1 p-5 sm:px-6 sm:py-5 flex flex-col justify-center">
              <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">
                HOD OVERVIEW
              </p>
              <p className="text-[20px] sm:text-[22px] font-heading font-bold text-slate-900 mb-0.5">{user?.name}</p>
              <p className="text-[13px] sm:text-[14px] text-slate-500 mb-3">Head of Department</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  {user?.department ?? 'CSIT'}
                </span>
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  SRKR Engineering College
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-slate-400 font-medium">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Request Statistics Grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="card p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-400">Total Requests</span>
              <ClipboardList size={16} className="text-orange-500" />
            </div>
            <p className="text-[22px] font-bold text-slate-900">{requestsList.length}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-400">Pending Review</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="text-[22px] font-bold text-amber-600">{pendingCount}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-400">Approved</span>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <p className="text-[22px] font-bold text-emerald-600">{approvedCount}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-400">Rejected</span>
              <XCircle size={16} className="text-rose-500" />
            </div>
            <p className="text-[22px] font-bold text-rose-600">{rejectedCount}</p>
          </div>
        </motion.div>

        {/* ── Recent Requests Live Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm"
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Recent Permission Requests</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Latest attendance permission requests across department</p>
            </div>
            <button
              onClick={() => navigate('/hod/requests')}
              className="text-[13px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight size={15} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[13px] text-slate-400">Loading requests...</div>
          ) : recentRequests.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-400">No requests submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Faculty</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentRequests.map(req => {
                    const studentName = req.student?.name || (req as any).studentName || req.studentId || 'Student';
                    const studentRoll = req.student?.rollNumber || (req as any).rollNumber || (req.studentId?.startsWith('stu-') ? req.studentId.replace('stu-', '').toUpperCase() : req.studentId);
                    const facultyName = req.faculty?.name || req.primaryFaculty?.name || (req as any).facultyName || 'Department Faculty';
                    const reasonLabel = req.reasonLabel || req.reason || 'Permission Request';

                    return (
                      <tr
                        key={req.id}
                        onClick={() => navigate(`/hod/request/${req.id}`)}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={studentName} src={req.student?.avatarUrl} size="sm" role="student" />
                            <span className="text-[13px] font-semibold text-slate-800">{studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-mono text-slate-500">
                          {studentRoll}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-slate-700 font-medium">
                          {reasonLabel}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 inline-block">
                            {facultyName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-slate-500">
                          {formatDate(req.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={req.status} finalDecisionBy={req.finalDecisionBy} finalDecisionName={req.finalDecisionName} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ── Quick Navigation Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <div
                key={link.label}
                onClick={() => navigate(link.to)}
                className="card p-5 cursor-pointer hover:border-orange-200 transition-all duration-200 group flex items-start gap-4"
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #EEF2F7',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: link.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} style={{ color: link.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {link.label}
                    </h3>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[12px] text-slate-400 leading-snug">
                    {link.description}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

      </div>
    </PageWrapper>
  );
}
