import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, ShieldAlert, Award, Percent, Users, Phone, Mail } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';

const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function FacultyStudents() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'counselees' | 'requests'>('counselees');

  // Query Assigned Counseling Students with Attendance Percentages
  const { data: counselees = [], isLoading: isLoadingCounselees } = useQuery({
    queryKey: ['counselees'],
    queryFn: () => api.getCounselees(),
  });

  // Query Permission Requests to derive Request Students
  const { data: requestsList = [] } = useQuery({
    queryKey: ['faculty-requests', user?.id],
    queryFn: () => api.getRequests(),
  });

  // Derive unique students from requests assigned to this faculty
  type StudentEntry = { id: string; name: string; rollNumber: string; avatarUrl?: string; total: number; pending: number; approved: number; rejected: number };
  const studentMap = new Map<string, StudentEntry>();
  requestsList.forEach((r: AttendanceRequest) => {
    const sId = r.studentId || r.student?.id || 'unknown';
    const sName = r.student?.name || r.studentName || 'Student';
    const sRoll = r.student?.rollNumber || r.rollNumber || '—';
    const sAvatar = r.student?.avatarUrl;

    const existing = studentMap.get(sId);
    if (!existing) {
      studentMap.set(sId, {
        id:         sId,
        name:       sName,
        rollNumber: sRoll,
        avatarUrl:  sAvatar,
        total:      1,
        pending:    r.status === 'pending'  ? 1 : 0,
        approved:   r.status === 'approved' ? 1 : 0,
        rejected:   r.status === 'rejected' ? 1 : 0,
      });
    } else {
      existing.total++;
      if (r.status === 'pending')  existing.pending++;
      if (r.status === 'approved') existing.approved++;
      if (r.status === 'rejected') existing.rejected++;
    }
  });

  const filteredCounselees = counselees.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNumber || s.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequestStudents = Array.from(studentMap.values()).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Faculty Portal</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Student Directory &amp; Counseling</h1>
          <p className="text-[14px] text-slate-400 mt-1">Manage your assigned counseling students and view live attendance analytics</p>
        </motion.div>

        {/* ── Tab Switcher & Search Bar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('counselees')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'counselees'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck size={15} />
                <span>Counseling Students ({counselees.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'requests'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={15} />
                <span>Request Students ({studentMap.size})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or roll number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-400 transition-all"
              />
            </div>

          </div>
        </div>

        {/* ── Tab Content 1: Counseling Students ── */}
        {activeTab === 'counselees' && (
          <div>
            {isLoadingCounselees ? (
              <div className="py-12 text-center text-slate-400 text-[13px]">
                Loading counseling students &amp; attendance analytics...
              </div>
            ) : filteredCounselees.length === 0 ? (
              <EmptyState
                title="No counseling students assigned"
                description={
                  search
                    ? 'No counseling student matches your search query.'
                    : 'Admin has not assigned any counseling students to your account yet. Admin can assign students via Admin User Management.'
                }
              />
            ) : (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-4"
              >
                {filteredCounselees.map(student => {
                  const stats = student.stats || {
                    conductedCount: 0,
                    presentCount: 0,
                    approvedPermissionsCount: 0,
                    absentCount: 0,
                    percentage: 85,
                  };

                  const pct = stats.percentage;

                  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let barBg = 'bg-emerald-500';
                  let statusText = 'Good Standing (85%+ Good)';

                  if (pct < 75) {
                    badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
                    barBg = 'bg-rose-500';
                    statusText = 'Critical Shortage (<75% Risk)';
                  } else if (pct < 85) {
                    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
                    barBg = 'bg-amber-500';
                    statusText = 'Borderline Warning (75-84%)';
                  }

                  return (
                    <motion.div
                      key={student.id}
                      variants={itemVariants}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4"
                    >
                      {/* Top Row: Avatar & Details */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Avatar name={student.name} src={student.avatarUrl} size="md" role="student" />
                          <div className="min-w-0">
                            <h3 className="text-[16px] font-heading font-bold text-slate-900 truncate">
                              {student.name}
                            </h3>
                            <p className="text-[12px] font-mono text-slate-500 font-bold">
                              Roll No: {student.rollNumber || student.id}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              <span>Dept: <strong>{student.department || 'CSIT'}</strong></span>
                              {student.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} className="text-orange-500" />
                                  {student.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Mail size={11} className="text-orange-500" />
                                {student.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${badgeBg}`}>
                          {pct < 75 ? <ShieldAlert size={14} /> : <Award size={14} />}
                          <span>{statusText}</span>
                        </div>
                      </div>

                      {/* Attendance Percentage Progress Bar */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[12px] font-bold">
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <Percent size={14} className="text-orange-500" />
                            Overall Attendance Percentage:
                          </span>
                          <span className={`text-[16px] font-black font-mono ${
                            pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {pct}%
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${barBg}`}
                          />
                        </div>

                        {/* Breakdown Row */}
                        <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] font-medium text-slate-500">
                          <span>Conducted Classes: <strong>{stats.conductedCount}</strong></span>
                          <span className="text-emerald-700">Present: <strong>{stats.presentCount}</strong></span>
                          <span className="text-amber-700">Approved Permissions: <strong>{stats.approvedPermissionsCount}</strong></span>
                          <span className="text-rose-700">Absent: <strong>{stats.absentCount}</strong></span>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Tab Content 2: Request Students ── */}
        {activeTab === 'requests' && (
          <div>
            {filteredRequestStudents.length === 0 ? (
              <EmptyState
                title="No request students found"
                description={search ? 'Try a different name or roll number.' : 'Students who submit permission requests will appear here.'}
              />
            ) : (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-4"
              >
                {filteredRequestStudents.map(s => (
                  <motion.div
                    key={s.id}
                    variants={itemVariants}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={s.name} src={s.avatarUrl} size="md" role="student" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[13px] text-slate-400 font-mono font-bold">{s.rollNumber}</p>
                      </div>
                      <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                        Request Student
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Total',    value: s.total,    color: 'text-slate-700'   },
                        { label: 'Pending',  value: s.pending,  color: 'text-amber-600'   },
                        { label: 'Approved', value: s.approved, color: 'text-emerald-600' },
                        { label: 'Rejected', value: s.rejected, color: 'text-rose-500'    },
                      ].map(stat => (
                        <div key={stat.label} className="text-center bg-slate-50 rounded-xl py-2">
                          <p className={`text-[16px] font-heading font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
