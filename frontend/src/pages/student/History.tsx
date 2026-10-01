import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, ClipboardList, Eye } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatDateShort, formatTimeAgo, formatSubmittedAt } from '../../lib/utils';
import type { RequestStatus } from '../../types';

type FilterValue = RequestStatus | 'all';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' },
  approved: { background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' },
  rejected: { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' },
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="history-status-badge"
      style={{
        ...STATUS_STYLE[status] ?? STATUS_STYLE.pending,
        fontSize: 11, fontWeight: 700, padding: '3px 8px',
        borderRadius: 20, display: 'inline-block', textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getAssignedFacultyDisplay(req: api.AttendanceRequest): string {
  if (req.faculties && req.faculties.length > 0) {
    const names = Array.from(new Set(req.faculties.map(f => f.name).filter(Boolean)));
    if (names.length > 0) return names.join(', ');
  }
  return req.faculty?.name || '—';
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

  const { data: studentRequests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: api.getRequests,
  });

  const filtered = studentRequests.filter(req => {
    const matchStatus = filter === 'all' || req.status === filter;
    const q = search.toLowerCase();
    const facultyStr = getAssignedFacultyDisplay(req).toLowerCase();
    const matchSearch = !q ||
      req.reasonLabel.toLowerCase().includes(q) ||
      (req.description ?? '').toLowerCase().includes(q) ||
      req.date.includes(q) ||
      facultyStr.includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <PageWrapper role="student">

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.06 }}
        className="history-card-container"
        style={{ ...card({ padding: '24px 28px' }) }}
      >
        {/* Header row: Title + Actions (Search & Status Dropdown) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 3px' }}>All Requests</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Your complete attendance permission history</p>
          </div>

          {/* Filter & Search controls */}
          <div className="history-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="history-filter-select"
                value={filter}
                onChange={e => setFilter(e.target.value as FilterValue)}
                style={{
                  height: 38, paddingLeft: 12, paddingRight: 32,
                  fontSize: 13, fontWeight: 600, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                  borderRadius: 11, outline: 'none', cursor: 'pointer',
                  appearance: 'none', WebkitAppearance: 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#E8EDF2'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="all">All Statuses ({studentRequests.length})</option>
                <option value="pending">Pending ({studentRequests.filter(r => r.status === 'pending').length})</option>
                <option value="approved">Approved ({studentRequests.filter(r => r.status === 'approved').length})</option>
                <option value="rejected">Rejected ({studentRequests.filter(r => r.status === 'rejected').length})</option>
              </select>
              <Filter size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>

            {/* Search bar */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                className="history-search-input"
                type="text"
                placeholder="Search requests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 34, paddingRight: 14, height: 38,
                  fontSize: 13, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                  borderRadius: 11, outline: 'none', width: 210,
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#E8EDF2'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </div>

        {/* Requests Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#F97316', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>Loading your requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <ClipboardList size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>No requests found</p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {search ? 'Try a different search term.' : 'No requests match the selected filter.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
                style={{ marginTop: 14, padding: '8px 20px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: 13, fontWeight: 600, color: '#EA580C', cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          /* ── Responsive Table (NO HORIZONTAL SCROLL ON ANY DEVICE) ── */
          <div className="history-table-container" style={{ borderRadius: 12, border: '1px solid #EEF2F7', width: '100%', boxSizing: 'border-box' }}>
            <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #EEF2F7' }}>
                  <th className="col-index tablet-hide" style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>#</th>
                  <th className="col-date" style={{ padding: '12px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                  <th className="col-subject" style={{ padding: '12px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Subject</th>
                  <th className="col-faculty mobile-hide" style={{ padding: '12px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Faculty</th>
                  <th className="col-status" style={{ padding: '12px 6px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Status</th>
                  <th className="col-submitted tablet-hide" style={{ padding: '12px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Submitted</th>
                  <th className="col-action mobile-hide" style={{ padding: '12px 6px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/student/request/${req.id}`)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                      cursor: 'pointer',
                      background: i % 2 === 0 ? '#ffffff' : '#fafbfc',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF7ED')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafbfc')}
                  >
                    <td className="col-index tablet-hide" style={{ padding: '12px 8px', textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                      {i + 1}
                    </td>
                    <td className="col-date" style={{ padding: '12px 10px', color: '#1E293B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <span className="desktop-only">{formatDate(req.date)}</span>
                      <span className="mobile-only">{formatDateShort(req.date)}</span>
                    </td>
                    <td className="col-subject" style={{ padding: '12px 10px', color: '#0F172A', fontWeight: 600 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.reasonLabel}
                      </div>
                    </td>
                    <td
                      className="col-faculty mobile-hide"
                      style={{ padding: '12px 10px', color: '#475569', fontWeight: 500 }}
                      title={getAssignedFacultyDisplay(req)}
                    >
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getAssignedFacultyDisplay(req)}
                      </span>
                    </td>
                    <td className="col-status" style={{ padding: '12px 6px', textAlign: 'center' }}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="col-submitted tablet-hide" style={{ padding: '12px 10px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }} title={formatSubmittedAt(req.submittedAt)}>
                      {formatTimeAgo(req.submittedAt) || formatSubmittedAt(req.submittedAt)}
                    </td>
                    <td className="col-action mobile-hide" style={{ padding: '12px 6px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="history-action-btn"
                        onClick={e => { e.stopPropagation(); navigate(`/student/request/${req.id}`); }}
                        style={{
                          background: '#FFF7ED', border: '1px solid #FED7AA',
                          color: '#EA580C', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '5px 8px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                          gap: 3, transition: 'all 0.15s ease', margin: '0 auto',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FFEDD5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; }}
                        title="View request details"
                      >
                        <Eye size={12} />
                        <span className="desktop-only">View</span>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Strict Responsive Styles: Zero Horizontal Scrolling ── */}
      <style>{`
        /* ── Base Table Configuration (All screens: NO horizontal scrollbar) ── */
        .history-card-container {
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .history-table-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          box-sizing: border-box;
        }
        .history-table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse;
        }
        .history-table th,
        .history-table td {
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
          vertical-align: middle !important;
        }
        .col-subject {
          max-width: 0;
        }

        /* ── Desktop (1024px and up) ── */
        @media screen and (min-width: 1024px) {
          .desktop-only { display: inline !important; }
          .tablet-hide  { display: table-cell !important; }
          .mobile-hide  { display: table-cell !important; }
          .mobile-only  { display: none !important; }

          .col-index     { width: 44px; text-align: center; }
          .col-date      { width: 112px; }
          .col-subject   { width: auto; }
          .col-faculty   { width: 175px; }
          .col-status    { width: 105px; text-align: center; }
          .col-submitted { width: 115px; }
          .col-action    { width: 70px; text-align: center; }
        }

        /* ── Tablet / Compact Laptop (641px - 1023px) ── */
        @media screen and (min-width: 641px) and (max-width: 1023px) {
          .desktop-only { display: inline !important; }
          .tablet-hide  { display: none !important; }
          .mobile-hide  { display: table-cell !important; }
          .mobile-only  { display: none !important; }

          .history-card-container {
            padding: 20px 16px !important;
          }
          .history-table th,
          .history-table td {
            padding: 10px 8px !important;
          }

          .col-index     { display: none !important; }
          .col-submitted { display: none !important; }

          .col-date    { width: 105px; }
          .col-subject { width: auto; }
          .col-faculty { width: 150px; }
          .col-status  { width: 95px; text-align: center; }
          .col-action  { width: 62px; text-align: center; }
        }

        /* ── Mobile (640px and below): Clean, Simple 3 Columns ── */
        @media screen and (max-width: 640px) {
          .desktop-only { display: none !important; }
          .tablet-hide  { display: none !important; }
          .mobile-hide  { display: none !important; }
          .mobile-only  { display: inline !important; }

          .history-card-container {
            padding: 16px 8px !important;
          }
          .history-controls {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .history-controls > div {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }
          .history-search-input,
          .history-filter-select {
            width: 100% !important;
            min-width: 0 !important;
          }

          /* Hide non-critical columns on mobile */
          .col-index,
          .col-faculty,
          .col-submitted,
          .col-action {
            display: none !important;
          }

          .history-table th,
          .history-table td {
            padding: 12px 8px !important;
          }

          /* Perfect 3-column distribution (100% total) */
          .col-date {
            width: 25% !important;
            text-align: left !important;
          }
          .col-subject {
            width: 50% !important;
            text-align: left !important;
          }
          .col-status {
            width: 25% !important;
            text-align: center !important;
          }

          .history-status-badge {
            font-size: 10.5px !important;
            padding: 2.5px 7px !important;
          }
        }
      `}</style>

    </PageWrapper>
  );
}
