import { motion } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldAlert, Settings, ArrowRight, UserCheck, KeyRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';

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

  const quickLinks = [
    {
      label: 'Manage Accounts & Students',
      description: 'Create, update, and manage student, faculty, and HOD accounts',
      icon: Users,
      to: '/admin/users',
      color: '#F97316',
      bg: 'rgba(249,115,22,0.08)'
    },
    {
      label: 'Password Management',
      description: 'Self-service password updates and user password resets',
      icon: KeyRound,
      to: '/admin/settings',
      color: '#10B981',
      bg: 'rgba(16,185,129,0.08)'
    },
    {
      label: 'Portal Preferences',
      description: 'Configure global system parameters and security controls',
      icon: Settings,
      to: '/admin/settings',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.08)'
    },
  ];

  return (
    <PageWrapper role="admin">
      <div className="max-w-4xl mx-auto">

        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden mb-6 sm:mb-8"
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #EEF2F7',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Logo area */}
            <div className="sm:w-44 w-full h-44 sm:h-auto flex-shrink-0 bg-slate-50 flex items-center justify-center border-r border-slate-100">
              <ShieldAlert size={64} className="text-orange-500" />
            </div>
            {/* Info */}
            <div className="flex-1 p-5 sm:px-6 sm:py-5 flex flex-col justify-center">
              <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">
                SYSTEM ADMINISTRATOR
              </p>
              <p className="text-[20px] sm:text-[22px] font-heading font-bold text-slate-900 mb-0.5">{user?.name}</p>
              <p className="text-[13px] sm:text-[14px] text-slate-500 mb-3">Portal Root Admin</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  User & Student Management
                </span>
                <span className="px-3 py-1 text-[11px] sm:text-[12px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  SRKR Engineering College
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-slate-400 font-medium">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Students', value: studentsCount, color: '#0F172A' },
            { label: 'Faculty', value: facultyCount, color: '#0F172A' },
            { label: 'HODs', value: hodCount, color: '#0F172A' },
            { label: 'Total Accounts', value: totalUsers, color: '#F97316' },
          ].map(stat => (
            <div
              key={stat.label}
              className="card p-5 text-center"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #EEF2F7',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
              }}
            >
              <p className="text-[28px] font-bold tracking-tight mb-1" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
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
