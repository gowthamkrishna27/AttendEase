import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MoreVertical, Filter, ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTimeAgo } from '../../lib/utils';
import type { RequestStatus } from '../../types';

type FilterValue = RequestStatus | 'all';

const FILTERS: { label: string; value: FilterValue; color: string; bg: string; activeBg: string; activeText: string }[] = [
  { label: 'All', value: 'all', color: '#64748B', bg: '#F8FAFC', activeBg: '#0F172A', activeText: '#fff' },
  { label: 'Pending', value: 'pending', color: '#D97706', bg: '#FEF3C7', activeBg: '#F59E0B', activeText: '#fff' },
  { label: 'Approved', value: 'approved', color: '#059669', bg: '#D1FAE5', activeBg: '#10B981', activeText: '#fff' },
  { label: 'Rejected', value: 'rejected', color: '#DC2626', bg: '#FEE2E2', activeBg: '#EF4444', activeText: '#fff' },
];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' },
  approved: { background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' },
  rejected: { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' },
};

const STATUS_LEFT: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      ...STATUS_STYLE[status] ?? STATUS_STYLE.pending,
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, display: 'inline-block', textTransform: 'capitalize',
    }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const card = (extra: object = {}) => ({
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #EEF2F7',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  ...extra,
});

export default function History() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const { data: studentRequests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: api.getRequests,
  });

  const filtered = studentRequests.filter(req => {
    const matchStatus = filter === 'all' || req.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      req.reasonLabel.toLowerCase().includes(q) ||
      (req.description ?? '').toLowerCase().includes(q) ||
      req.date.includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <PageWrapper role="student">

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.06 }}
        style={{ ...card({ padding: '24px 28px' }) }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 3px' }}>All Requests</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Your complete attendance permission history</p>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 34, paddingRight: 14, height: 38,
                fontSize: 13, color: '#1E293B',
                background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                borderRadius: 11, outline: 'none', width: 220,
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = '#E8EDF2'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Filter size={13} style={{ color: '#94A3B8' }} />
          {FILTERS.map(f => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: isActive ? f.activeBg : f.bg,
                  color: isActive ? f.activeText : f.color,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <ClipboardList size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>No requests found</p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {search ? 'Try a different search term.' : 'No requests match the selected filter.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
                style={{ marginTop: 14, padding: '8px 20px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E8EDF2', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  {['Date', 'Subject', 'Reason', 'Faculty', 'Status', 'Submitted', ''].map(h => (
                    <th key={h} style={{ padding: '0 12px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(`/student/request/${req.id}`)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${STATUS_LEFT[req.status] ?? '#E8EDF2'}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {formatDate(req.date)}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                      {req.reasonLabel}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748B', maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.description?.split('.')[0] ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
                      {req.faculty?.name ?? '—'}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {formatTimeAgo(req.submittedAt)}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/student/request/${req.id}`); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </PageWrapper>
  );
}
