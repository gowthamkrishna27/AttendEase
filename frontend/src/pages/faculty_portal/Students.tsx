import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';
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

  const students = Array.from(studentMap.values()).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Faculty</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Students</h1>
          <p className="text-[14px] text-slate-400 mt-1">Students who have submitted requests assigned to you</p>
        </motion.div>

        {/* ── Search ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 }}
          className="relative mb-5"
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or roll number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all"
          />
        </motion.div>

        {/* ── Student Cards ── */}
        {students.length === 0 ? (
          <EmptyState
            title="No students found"
            description={search ? 'Try a different name or roll number.' : 'Students who submit requests will appear here.'}
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4"
          >
            {students.map(s => (
              <motion.div
                key={s.id}
                variants={itemVariants}
                className="card px-6 py-5"
              >
                {/* Top row */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar name={s.name} src={s.avatarUrl} size="md" role="student" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-[13px] text-slate-400">{s.rollNumber}</p>
                  </div>
                  <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex-shrink-0">
                    Student
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total',    value: s.total,    color: 'text-slate-700'   },
                    { label: 'Pending',  value: s.pending,  color: 'text-amber-600'   },
                    { label: 'Approved', value: s.approved, color: 'text-emerald-600' },
                    { label: 'Rejected', value: s.rejected, color: 'text-rose-500'    },
                  ].map(stat => (
                    <div key={stat.label} className="text-center bg-slate-50 rounded-xl py-2.5">
                      <p className={`text-[18px] font-heading font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </PageWrapper>
  );
}
