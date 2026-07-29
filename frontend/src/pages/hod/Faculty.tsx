import { motion } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
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

  const filteredFaculty = facultyList
    .filter((fac: Faculty) => {
      if (fac.role === 'hod') return false;
      const nameLower = (fac.name || '').toLowerCase();
      if (nameLower.includes('suresh') || nameLower.includes('gopi') || nameLower.includes('ngk') || nameLower.includes('priya nair')) return false;
      return true;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Faculty Members</h1>
          <p className="text-[14px] text-slate-400 mt-1">Faculty directory and attendance request statistics</p>
        </motion.div>

        {/* ── Faculty Cards ── */}
        {filteredFaculty.length === 0 ? (
          <EmptyState
            title="No faculty members found"
            description="Faculty members will appear here once registered."
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
          >
            {filteredFaculty.map((fac: Faculty) => {
              const facRequests  = requestsList.filter((r: AttendanceRequest) => r.facultyId === fac.id || r.faculty?.id === fac.id || r.faculty?.email === fac.email);
              const pending      = facRequests.filter((r: AttendanceRequest) => r.status === 'pending').length;
              const approved     = facRequests.filter((r: AttendanceRequest) => r.status === 'approved').length;
              const rejected     = facRequests.filter((r: AttendanceRequest) => r.status === 'rejected').length;
              const total        = facRequests.length;
              const pct          = total > 0 ? Math.round((pending / total) * 100) : 0;

              return (
                <motion.div
                  key={fac.id}
                  variants={itemVariants}
                  className="card overflow-hidden"
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    border: '1px solid #EEF2F7',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex flex-row items-stretch">
                    {/* Photo Container */}
                    <div className="w-28 sm:w-48 flex-shrink-0 bg-slate-100 overflow-hidden flex items-center justify-center relative">
                      <img
                        src={fac.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fac.name || 'Faculty')}&background=F97316&color=fff&size=240`}
                        alt={fac.name}
                        className="w-full h-full object-cover object-top"
                        onError={e => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fac.name || 'Faculty')}&background=F97316&color=fff&size=240`;
                        }}
                      />
                    </div>

                    {/* Info Container */}
                    <div className="flex-1 p-3.5 sm:px-6 sm:py-5 flex flex-col justify-center min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1">
                        {fac.role === 'hod' ? 'HOD OVERVIEW' : 'FACULTY OVERVIEW'}
                      </p>
                      <p className="text-[15px] sm:text-[22px] font-heading font-bold text-slate-900 mb-0.5 truncate">
                        {fac.name}
                      </p>
                      <p className="text-[11px] sm:text-[14px] text-slate-500 mb-2 truncate">
                        {fac.designation || (fac.role === 'hod' ? 'Head of Department' : 'Assistant Professor')}
                      </p>
                      
                      {/* Department & College Badges */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[12px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                          {fac.department ?? 'CSIT'}
                        </span>
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[12px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          SRKR Engineering College
                        </span>
                      </div>

                      {/* Email */}
                      <p className="text-[11px] sm:text-[13px] text-slate-400 font-medium truncate">
                        {fac.email}
                      </p>
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
                    <div className="w-full sm:w-1/2">
                      <div className="flex items-center justify-between mb-1 text-[10px] sm:text-[11px]">
                        <span className="text-slate-400 font-medium">Pending Requests Load</span>
                        <span className="font-semibold text-amber-600">{pct}% ({pending} pending)</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-4 text-[11px] sm:text-[12px]">
                      <span className="text-slate-600 font-medium">Total: <strong>{total}</strong></span>
                      <span className="text-emerald-600 font-medium">Approved: <strong>{approved}</strong></span>
                      <span className="text-rose-500 font-medium">Rejected: <strong>{rejected}</strong></span>
                    </div>
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
