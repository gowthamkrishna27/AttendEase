import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, CheckCheck, Trash2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';

interface NotificationItem {
  id: number;
  type: 'approved' | 'rejected' | 'pending';
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const removeNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markSingleRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <PageWrapper role="student">
      {/* Clean Top Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #EEF2F7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
              {unreadCount} unread
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', color: '#F97316',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <CheckCheck size={14} /> Mark Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', color: '#94A3B8',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Clean Notification Box Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #EEF2F7',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        overflow: 'hidden',
      }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: '#64748B' }}>All Caught Up!</p>
            <p style={{ fontSize: 12, margin: 0 }}>You have no notifications right now.</p>
          </div>
        ) : (
          notifications.map((item, idx) => {
            const statusConfig = {
              approved: {
                icon: <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />,
                bg: 'rgba(16,185,129,0.08)',
                color: '#047857',
              },
              rejected: {
                icon: <XCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />,
                bg: 'rgba(239,68,68,0.08)',
                color: '#B91C1C',
              },
              pending: {
                icon: <Clock size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />,
                bg: 'rgba(245,158,11,0.08)',
                color: '#B45309',
              },
            };

            const cfg = statusConfig[item.type];
            const isLast = idx === notifications.length - 1;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                onClick={() => markSingleRead(item.id)}
                style={{
                  padding: '16px 18px',
                  background: item.unread ? '#FFFDFB' : '#ffffff',
                  borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  cursor: 'pointer', transition: 'background 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Status Icon Indicator */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
                      {item.unread && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{item.time}</span>
                  </div>

                  <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                </div>

                {/* Dismiss Icon */}
                <button
                  onClick={(e) => removeNotification(item.id, e)}
                  style={{
                    background: 'none', border: 'none', color: '#CBD5E1',
                    padding: 4, cursor: 'pointer', flexShrink: 0, borderRadius: 6,
                    transition: 'color 0.15s',
                  }}
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </PageWrapper>
  );
}
