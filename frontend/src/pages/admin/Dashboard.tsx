import { motion } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Settings, ArrowRight, UserCheck, Database, ClipboardList, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import logo from '../../assets/logo.png';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const studentsCount = usersList.filter(u => u.role === 'student').length;
  const facultyCount  = usersList.filter(u => u.role === 'faculty').length;
  const hodCount      = usersList.filter(u => u.role === 'hod').length;
  const totalUsers    = usersList.length;

  const modules = [
    {
      label: 'Manage Accounts',
      description: 'Create, edit, delete & bulk import student or faculty records',
      icon: Users,
      to: '/admin/users',
      tag: `${totalUsers} Accounts`
    },
    {
      label: 'Counseling Assignment',
      description: 'Map students to faculty counselors for guidance & approval flow',
      icon: UserCheck,
      to: '/admin/counseling',
      tag: 'Counseling'
    },
    {
      label: 'Invigilation Hours',
      description: 'View faculty invigilation duty assignments, hours and exam schedules',
      icon: ClipboardCheck,
      to: '/admin/invigilation',
      tag: 'Invigilation'
    },
    {
      label: 'Student Request Logs',
      description: 'Audit logs, status history, and exportable ledger of permission requests',
      icon: ClipboardList,
      to: '/admin/requests',
      tag: 'Audit Logs'
    },
    {
      label: 'Database Explorer (Tables View)',
      description: 'Inspect live PostgreSQL database tables, rows, schema, and raw data',
      icon: Database,
      to: '/admin/database',
      tag: 'Database'
    },
    {
      label: 'System & Security Settings',
      description: 'Self-service password management and system configuration',
      icon: Settings,
      to: '/admin/settings',
      tag: 'Security'
    },
  ];

  return (
    <PageWrapper role="admin">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#edf0f2] p-2 flex items-center justify-center border border-slate-200/60 shrink-0">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
                  SYSTEM ADMIN
                </span>
                <span className="text-[12px] text-[#6b7280]">SRKR Engineering College</span>
              </div>
              <h1 className="text-[20px] font-bold text-[#18181b] tracking-tight">{user?.name || 'Administrator'}</h1>
              <p className="text-[13px] text-[#6b7280]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex-1 sm:flex-initial h-[38px] px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[13px] font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Users size={15} />
              <span>Manage Users</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { label: 'Total Students', value: studentsCount },
            { label: 'Faculty Members', value: facultyCount },
            { label: 'Department HODs', value: hodCount },
            { label: 'Total Accounts', value: totalUsers },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[26px] font-bold text-[#18181b] tracking-tight mb-0.5">
                {stat.value}
              </p>
              <p className="text-[12px] text-[#6b7280] font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Minimal Management Overview */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13.5px] font-semibold text-[#18181b]">Management Shortcuts</h2>
            <span className="text-[11.5px] text-[#88929e]">Quick Admin Access</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {modules.map(module => {
              const Icon = module.icon;
              return (
                <div
                  key={module.label}
                  onClick={() => navigate(module.to)}
                  className="bg-white rounded-lg p-3.5 border border-slate-200/90 shadow-2xs hover:border-[#18181b] hover:bg-[#fafafa] transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-[#edf0f2] text-[#18181b] flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-[#18181b] truncate">
                        {module.label}
                      </h3>
                      <p className="text-[11.5px] text-[#6b7280] truncate">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[#88929e] group-hover:text-[#18181b] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
