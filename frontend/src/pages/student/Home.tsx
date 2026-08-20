import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, Clock, Plus, MoreVertical, User as UserIcon, ArrowRight, Lock
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDateShort, formatTimeAgo } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import srkrEmblem from '../../assets/srkr-emblem.png';

const card = (extra: object = {}) => ({
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #EEF2F7',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  ...extra,
});


function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    pending: { background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' },
    approved: { background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' },
    rejected: { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' },
  };
  return (
    <span style={{
      ...styles[status] ?? styles.pending,
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, display: 'inline-block', textTransform: 'capitalize',
    }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function StudentHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: allRequests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: api.getRequests,
  });

  const recent = allRequests.slice(0, 3);

  const quickActions = [
    { label: 'New Request', icon: Plus, color: '#F97316', bg: 'rgba(249,115,22,0.09)', to: '/student/new-request' },
    { label: 'History', icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.09)', to: '/student/history' },
    { label: 'Profile', icon: UserIcon, color: '#3B82F6', bg: 'rgba(59,130,246,0.09)', to: '/student/profile' },
    { label: 'Change Password', icon: Lock, color: '#EF4444', bg: 'rgba(239,68,68,0.09)', to: '/student/profile', state: { tab: 'Account Settings' } },
  ];

  return (
    <PageWrapper role="student">
      <style>{`
        @media (max-width: 768px) {
          .stat-grid        { grid-template-columns: repeat(2,1fr) !important; gap: 16px 8px !important; }
          .stat-item        { border-right: none !important; border-bottom: 1px solid #EEF2F7; padding: 12px 6px !important; }
          .stat-item:nth-child(even) { border-right: none !important; }
          .stat-item:nth-child(n+3) { border-bottom: none !important; }
          .desktop-form     { display: none !important; }
          .desktop-requests { display: none !important; }
          .mobile-requests  { display: block !important; }
          .student-id-card  { padding: 20px 16px !important; gap: 16px !important; }
          .student-id-avatar { width: 96px !important; height: 120px !important; }
        }
        @media (min-width: 769px) {
          .stat-item        { border-right: 1px solid #EEF2F7; }
          .stat-item:last-child { border-right: none !important; }
          .mobile-quick     { display: none !important; }
          .mobile-requests  { display: none !important; }
          .student-id-avatar { width: 84px !important; height: 105px !important; }
        }
      `}</style>

      {/* ── Student ID Card (desktop/mobile top) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={{ translateY: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}
        className="student-id-card"
        style={{
          ...card({ padding: '24px 28px', marginBottom: 24 }),
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
          display: 'flex', alignItems: 'center', gap: 24,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        }}
      >
        {/* Emblem/Avatar attached directly to student card */}
        <motion.div
          whileHover={{ scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="student-id-avatar"
          style={{
            width: user?.avatarUrl ? 80 : 70,
            height: user?.avatarUrl ? 100 : 70,
            borderRadius: 10,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <img src={srkrEmblem} alt="SRKR" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          )}
        </motion.div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#000000', margin: 0 }}>{user?.name ?? 'Student'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: '#64748B' }}>
            <span>Roll No: <strong style={{ color: '#000000' }}>{(user as any)?.rollNumber ?? '24B91A0720'}</strong></span>
            <span>Department: <strong style={{ color: '#000000' }}>{user?.department ?? 'Computer Science'}</strong></span>
            <span>Semester: <strong style={{ color: '#000000' }}>{(user as any)?.semester ?? '6'}th Sem</strong></span>
          </div>
        </div>
      </motion.div>

      {/* ── Attendance Permission Banner (desktop) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={{ translateY: -1, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}
        className="desktop-form"
        style={{
          ...card({ padding: '22px 28px', marginBottom: 24 }),
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#000000', margin: '0 0 4px' }}>Need Attendance permission?</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/student/new-request')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 12,
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              color: '#EA580C',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#EA580C';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#EA580C';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFF7ED';
              e.currentTarget.style.color = '#EA580C';
              e.currentTarget.style.borderColor = '#FED7AA';
            }}
          >
            <Plus size={15} />
            New Request
          </motion.button>
        </div>
      </motion.div>

      {/* ── Recent Requests Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
        className="desktop-requests"
        style={{ ...card({ padding: '24px 28px' }) }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>Recent Requests</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Overview of your recent permission applications</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/student/history')}
            style={{ fontSize: 13, fontWeight: 600, color: '#EA580C', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFEDD5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; }}
          >
            View all
          </motion.button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #EEF2F7' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #EEF2F7' }}>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', width: 40 }}>#</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Subject</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Reason / Details</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Submitted</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((req, i) => (
                <motion.tr
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.05, duration: 0.2 }}
                  onClick={() => navigate(`/student/request/${req.id}`)}
                  style={{
                    borderBottom: i < recent.length - 1 ? '1px solid #F1F5F9' : 'none',
                    cursor: 'pointer',
                    background: i % 2 === 0 ? '#ffffff' : '#fafbfc',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFF7ED')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafbfc')}
                >
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#1E293B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatDateShort(req.date)}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {req.reasonLabel}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748B', maxWidth: 240 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.description?.split('.')[0] || req.reasonLabel}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <StatusBadge status={req.status} />
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748B', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {formatTimeAgo(req.submittedAt)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={e => { e.stopPropagation(); navigate(`/student/request/${req.id}`); }}
                      style={{
                        background: '#FFF7ED', border: '1px solid #FED7AA',
                        color: '#EA580C', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                        gap: 3, transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FFEDD5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; }}
                      title="View details"
                    >
                      <MoreVertical size={13} />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Recent Requests List (mobile) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.14 }}
        className="mobile-requests"
        style={{ display: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#000000', margin: 0 }}>Recent Requests</h2>
          <button onClick={() => navigate('/student/history')} style={{ fontSize: 13, fontWeight: 600, color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
        </div>

        <div style={{ ...card(), overflow: 'hidden' }}>
          {recent.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/student/request/${req.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < recent.length - 1 ? '1px solid #F8FAFC' : 'none',
                cursor: 'pointer',
              }}
            >
              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardList size={18} style={{ color: '#EA580C' }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#000000', margin: '0 0 2px' }}>{req.reasonLabel}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  {formatDateShort(req.date)} · {req.reasonLabel}
                </p>
              </div>
              {/* Status + arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <StatusBadge status={req.status} />
                <ArrowRight size={14} style={{ color: '#CBD5E1' }} />
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => navigate('/student/history')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 13, fontWeight: 600, color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all requests <ArrowRight size={13} />
        </button>
      </motion.div>

    </PageWrapper>
  );
}
