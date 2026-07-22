import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, Clock, Plus, MoreVertical, User as UserIcon, ArrowRight
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
    { label: 'Profile', icon: UserIcon, color: '#F97316', bg: 'rgba(249,115,22,0.09)', to: '/student/profile' },
    { label: 'View All', icon: ClipboardList, color: '#10B981', bg: 'rgba(16,185,129,0.09)', to: '/student/history' },
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
          .mobile-quick     { display: grid !important; }
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
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        className="student-id-card"
        style={{
          ...card({ padding: '24px 28px', marginBottom: 24 }),
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
          display: 'flex', alignItems: 'center', gap: 24,
        }}
      >
        {/* Emblem/Avatar attached directly to student card */}
        <div
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
        </div>

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

      {/* ── MOBILE: Quick Actions 2×2 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.05 }}
        className="mobile-quick"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, display: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: '1/-1' }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#000000', margin: 0 }}>Quick Actions</p>
          <button onClick={() => navigate('/student/history')} style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
        </div>
        {quickActions.map(({ label, icon: Icon, color, bg, to }) => (
          <button key={label} onClick={() => navigate(to)} style={{ ...card({ padding: '16px' }), display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#000000', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>→</p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* ── Attendance Permission Banner (desktop) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }}
        className="desktop-form"
        style={{ ...card({ padding: '22px 28px', marginBottom: 24 }) }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#000000', margin: '0 0 4px' }}>Need Attendance permission?</h2>
          </div>
          <button
            onClick={() => navigate('/student/new-request')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '12px 22px', borderRadius: 12,
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(249,115,22,0.30)',
            }}
          >
            <Plus size={15} />
            New Request
          </button>
        </div>
      </motion.div>

      {/* ── Recent Requests Table (desktop) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }}
        className="desktop-requests"
        style={{ ...card({ padding: '24px 28px' }) }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>Recent Requests</h2>
          <button
            onClick={() => navigate('/student/history')}
            style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View all
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['Date', 'Subject', 'Reason', 'Status', 'Submitted', ''].map(h => (
                  <th key={h} style={{ padding: '0 12px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((req, i) => (
                <tr
                  key={req.id}
                  onClick={() => navigate(`/student/request/${req.id}`)}
                  style={{
                    borderBottom: i < recent.length - 1 ? '1px solid #F8FAFC' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 12px', fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatDateShort(req.date)}
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                    {req.reasonLabel}
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748B' }}>
                    {req.description?.split('.')[0] ?? req.reasonLabel}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <StatusBadge status={req.status} />
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {formatTimeAgo(req.submittedAt)}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4 }}>
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Recent Requests List (mobile) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }}
        className="mobile-requests"
        style={{ display: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#000000', margin: 0 }}>Recent Requests</h2>
          <button onClick={() => navigate('/student/history')} style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
        </div>

        <div style={{ ...card(), overflow: 'hidden' }}>
          {recent.map((req, i) => (
            <div
              key={req.id}
              onClick={() => navigate(`/student/request/${req.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < recent.length - 1 ? '1px solid #F8FAFC' : 'none',
                cursor: 'pointer',
              }}
            >
              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardList size={18} style={{ color: '#2563EB' }} />
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
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/student/history')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 13, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all requests <ArrowRight size={13} />
        </button>
      </motion.div>

    </PageWrapper>
  );
}
