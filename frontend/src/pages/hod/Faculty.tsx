import { motion } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { AttendanceRequest, Faculty } from '../../types';

const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function HODFaculty() {
  const { data: facultyList = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => api.getFaculty(),
  });

  const { data: requestsList = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
  });

  return (
    <PageWrapper role="hod">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">HOD</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Faculty</h1>
          <p className="text-[14px] text-slate-400 mt-1">Manage faculty members and view their request statistics</p>
        </motion.div>

        {/* ── Faculty Cards ── */}
        {facultyList.length === 0 ? (
          <EmptyState
            title="No faculty members found"
            description="Faculty members will appear here once registered."
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4"
          >
            {facultyList.map((fac: Faculty) => {
              const facRequests  = requestsList.filter((r: AttendanceRequest) => r.facultyId === fac.id);
              const pending      = facRequests.filter((r: AttendanceRequest) => r.status === 'pending').length;
              const approved     = facRequests.filter((r: AttendanceRequest) => r.status === 'approved').length;
              const rejected     = facRequests.filter((r: AttendanceRequest) => r.status === 'rejected').length;
              const total        = facRequests.length;
              const pct          = total > 0 ? Math.round((pending / total) * 100) : 0;

              return (
                <motion.div
                  key={fac.id}
                  variants={itemVariants}
                  className="card px-6 py-5"
                >
                  {/* Top row */}
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar name={fac.name} size="md" role="faculty" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-bold text-slate-900">{fac.name}</p>
                      <p className="text-[13px] text-slate-400">{fac.department}</p>
                    </div>
                    <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      Faculty
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-[13px] text-slate-500">
                    <span>📧 {fac.email}</span>
                  </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-slate-400 font-medium">Pending load</span>
                    <span className="text-[12px] font-semibold text-amber-600">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total',    value: total,    color: 'text-slate-700'   },
                    { label: 'Pending',  value: pending,  color: 'text-amber-600'   },
                    { label: 'Approved', value: approved, color: 'text-emerald-600' },
                    { label: 'Rejected', value: rejected, color: 'text-rose-500'    },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-slate-50 rounded-xl py-2.5">
                      <p className={`text-[18px] font-heading font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        )}

      </div>
    </PageWrapper>
  );
}
