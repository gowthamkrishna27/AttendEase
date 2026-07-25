import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Clock, User, LogOut,
  Bell, GraduationCap, Plus,
  ClipboardList, Users, BarChart2, Settings, Shield,
  FileCheck, Building2, Layers, Award, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import srkrEmblem from '../../assets/srkr-emblem.png';

interface PageWrapperProps {
  children: ReactNode;
  role?: 'student' | 'faculty' | 'hod' | 'admin' | 'viewer';
  showGreeting?: boolean;
}

const viewerNav = [
  { to: '/permissions',                      label: 'All Approved Passes', icon: FileCheck   },
  { to: '/permissions?sec=CSD-A',           label: 'CSD — Section A',    icon: Building2   },
  { to: '/permissions?sec=CSD-B',           label: 'CSD — Section B',    icon: Building2   },
  { to: '/permissions?sec=CSIT-A',          label: 'CSIT — Section A',   icon: Layers      },
  { to: '/permissions?sec=CSIT-B',          label: 'CSIT — Section B',   icon: Layers      },
  { to: '/permissions?reason=medical',      label: 'Medical Passes',     icon: FileText    },
  { to: '/permissions?reason=internship',   label: 'Internship Passes',  icon: Award       },
  { to: '/permissions?reason=competition',  label: 'Hackathon Passes',   icon: Award       },
];

const studentNav = [
  { to: '/student', label: 'Home', icon: Home },
  { to: '/student/new-request', label: 'New Request', icon: Plus },
  { to: '/student/history', label: 'History', icon: Clock },
  { to: '/student/profile', label: 'Profile', icon: User },
];
const facultyNav = [
  { to: '/faculty',          label: 'Dashboard', icon: Home          },
  { to: '/faculty/requests', label: 'Requests',  icon: ClipboardList },
  { to: '/faculty/students', label: 'Students',  icon: Users         },
  { to: '/faculty/reports',  label: 'Reports',   icon: BarChart2     },
  { to: '/faculty/settings', label: 'Settings',  icon: Settings      },
];

const hodNav = [
  { to: '/hod',          label: 'Overview',     icon: Home          },
  { to: '/hod/requests', label: 'All Requests',  icon: ClipboardList },
  { to: '/hod/faculty',  label: 'Faculty',       icon: Users         },
  { to: '/hod/reports',  label: 'Reports',       icon: BarChart2     },
  { to: '/permissions',  label: 'Permissions',   icon: Shield        },
  { to: '/hod/settings', label: 'Settings',      icon: Settings      },
];

const adminNav = [
  { to: '/admin',          label: 'Dashboard',     icon: Home     },
  { to: '/admin/users',    label: 'User & Students', icon: Users    },
  { to: '/permissions',    label: 'Permissions',   icon: Shield   },
  { to: '/admin/settings', label: 'Settings',      icon: Settings },
];

/* Bottom tab bar items (mobile) */
const viewerMobileBottomNav = [
  { id: 'permissions', to: '/permissions',            label: 'Passes', icon: FileCheck, type: 'link' },
  { id: 'csd-a',       to: '/permissions?sec=CSD-A',  label: 'CSD-A',  icon: Building2, type: 'link' },
  { id: 'csd-b',       to: '/permissions?sec=CSD-B',  label: 'CSD-B',  icon: Building2, type: 'link' },
  { id: 'csit-a',      to: '/permissions?sec=CSIT-A', label: 'CSIT-A', icon: Layers,    type: 'link' },
  { id: 'csit-b',      to: '/permissions?sec=CSIT-B', label: 'CSIT-B', icon: Layers,    type: 'link' },
];

/* Bottom tab bar items (mobile) */
const studentMobileBottomNav = [
  { id: 'home', to: '/student', label: 'Home', icon: Home, type: 'link' },
  { id: 'notifications', to: '/student/notifications', label: 'Notifications', icon: Bell, type: 'link', hasBadge: true },
  { id: 'fab', type: 'fab', to: '/student/new-request' },
  { id: 'history', to: '/student/history', label: 'History', icon: Clock, type: 'link' },
  { id: 'profile', to: '/student/profile', label: 'Profile', icon: User, type: 'link' },
];

const facultyMobileBottomNav = [
  { id: 'home', to: '/faculty', label: 'Dashboard', icon: Home, type: 'link' },
  { id: 'requests', to: '/faculty/requests', label: 'Requests', icon: ClipboardList, type: 'link' },
  { id: 'students', to: '/faculty/students', label: 'Students', icon: Users, type: 'link' },
  { id: 'reports', to: '/faculty/reports', label: 'Reports', icon: BarChart2, type: 'link' },
  { id: 'settings', to: '/faculty/settings', label: 'Settings', icon: Settings, type: 'link' },
];

const hodMobileBottomNav = [
  { id: 'home', to: '/hod', label: 'Overview', icon: Home, type: 'link' },
  { id: 'faculty', to: '/hod/faculty', label: 'Faculty', icon: Users, type: 'link' },
  { id: 'requests', to: '/hod/requests', label: 'Requests', icon: ClipboardList, type: 'link' },
  { id: 'reports', to: '/hod/reports', label: 'Reports', icon: BarChart2, type: 'link' },
  { id: 'settings', to: '/hod/settings', label: 'Settings', icon: Settings, type: 'link' },
];

const adminMobileBottomNav = [
  { id: 'home', to: '/admin', label: 'Dashboard', icon: Home, type: 'link' },
  { id: 'users', to: '/admin/users', label: 'Users', icon: Users, type: 'link' },
  { id: 'settings', to: '/admin/settings', label: 'Settings', icon: Settings, type: 'link' },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function PageWrapper({ children, role = 'student' }: PageWrapperProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const desktopBellRef = useRef<HTMLDivElement>(null);
  const mobileBellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const isDesktopBellClick = desktopBellRef.current && desktopBellRef.current.contains(e.target as Node);
      const isMobileBellClick = mobileBellRef.current && mobileBellRef.current.contains(e.target as Node);
      if (!isDesktopBellClick && !isMobileBellClick) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;
  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const renderNotificationDropdown = (isMobile = false) => {
    if (!showNotifications) return null;
    return (
      <div style={{
        position: 'absolute',
        right: isMobile ? 'auto' : 0,
        left: isMobile ? -60 : 'auto',
        top: isMobile ? 'auto' : 46,
        bottom: isMobile ? 64 : 'auto',
        width: 310, maxWidth: '88vw',
        background: '#ffffff', border: '1px solid #EEF2F7',
        borderRadius: 16, boxShadow: '0 10px 30px rgba(13,27,42,0.18)',
        zIndex: 100, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EEF2F7' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#000000' }}>Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(n => {
              const borderStyles: Record<string, string> = {
                approved: '3px solid #10B981',
                rejected: '3px solid #EF4444',
                pending: '3px solid #F59E0B',
              };
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid #F8FAFC',
                    borderLeft: borderStyles[n.type] ?? 'none',
                    background: n.unread ? 'rgba(37,99,235,0.02)' : '#ffffff',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#000000' }}>{n.title}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{n.time}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.45 }}>{n.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const navLinks = role === 'viewer' ? viewerNav : role === 'student' ? studentNav : role === 'faculty' ? facultyNav : role === 'hod' ? hodNav : adminNav;
  const homeLink = role === 'viewer' ? '/permissions' : role === 'student' ? '/student' : role === 'faculty' ? '/faculty' : role === 'hod' ? '/hod' : '/admin';

  const handleLogout = () => { logout(); navigate('/'); };

  const hour = new Date().getHours();
  const firstName = user?.name?.split(' ')[0] ?? 'User';
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const [deviceTime, setDeviceTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDeviceDateTime = (dateObj: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[dateObj.getDay()];
    const dateNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dateNum} ${monthName} ${year}  ${hours}:${minutes}`;
  };

  const formatDeviceDateTimeMobile = (dateObj: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[dateObj.getDay()];
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${dayName}  ${hours}:${minutes}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F3F6FB', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* ═══════════════════════════════════════
          DESKTOP TOP BAR
      ═══════════════════════════════════════ */}
      <header className="desktop-topbar print:hidden" style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 60, background: '#ffffff',
        borderBottom: '1px solid #EEF2F7',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
      }}>
        <Link to={homeLink} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <img src={srkrEmblem} alt="SRKR" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.2 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>SRKR Engineering College</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: 0 }}>CSD & CSIT</p>
          </div>
        </Link>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Live Date & Time */}
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#475569',
            background: '#F8FAFC', padding: '6px 14px', borderRadius: 20,
            border: '1px solid #EEF2F7', display: 'flex', alignItems: 'center'
          }}>
            <span>{formatDeviceDateTime(deviceTime)}</span>
          </div>

          <div ref={desktopBellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ width: 38, height: 38, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E8EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <Bell size={17} />
            </button>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: '50%', background: '#F97316', border: '1.5px solid #fff' }} />
            )}
            {renderNotificationDropdown()}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          MOBILE TOP BAR
      ═══════════════════════════════════════ */}
      <header className="mobile-topbar print:hidden" style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 60, background: '#ffffff',
        borderBottom: '1px solid #EEF2F7',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        display: 'none', alignItems: 'center',
        padding: '0 16px',
      }}>
        {/* Left: logo + brand */}
        <Link to={homeLink} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <img src={srkrEmblem} alt="SRKR" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>SRKR Engineering College</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0, lineHeight: 1.2 }}>CSD & CSIT</p>
          </div>
        </Link>

        {/* Center/Time (mobile) */}
        <div style={{
          marginLeft: 'auto',
          fontSize: 11, fontWeight: 700, color: '#475569',
          background: '#F8FAFC', padding: '5px 10px', borderRadius: 8,
          border: '1px solid #EEF2F7', display: 'flex', alignItems: 'center'
        }}>
          <span>{formatDeviceDateTimeMobile(deviceTime)}</span>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          BODY: SIDEBAR + MAIN
      ═══════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="desktop-sidebar print:hidden" style={{
          width: 210, flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #EEF2F7',
          display: 'flex', flexDirection: 'column',
          padding: '16px 0',
          position: 'sticky', top: 60, height: 'calc(100vh - 60px)',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '0 16px 20px' }}>
            <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>
              <span style={{ color: '#000000' }}>Attend</span>
              <span style={{ color: '#F97316' }}>Ease</span>
            </p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Attendance Permission Portal</p>
          </div>

          <nav style={{ flex: 1, padding: '0 8px' }}>
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === homeLink}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 0, marginBottom: 0,
                    fontSize: 14, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#000000' : '#64748B',
                    background: 'transparent',
                    textDecoration: 'none',
                    borderLeft: isActive ? '3px solid #F97316' : '3px solid transparent',
                    paddingLeft: '13px',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <Icon size={16} />
                  {link.label}
                </NavLink>
              );
            })}

            {/* Logout */}
            {role !== 'viewer' && (
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 0,
                  marginTop: 28,
                  fontSize: 14, fontWeight: 600,
                  color: '#DC2626', background: 'transparent',
                  border: 'none', borderLeft: '3px solid #DC2626',
                  cursor: 'pointer', width: '100%',
                  paddingLeft: '13px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#EF4444';
                  e.currentTarget.style.borderLeftColor = '#EF4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#DC2626';
                  e.currentTarget.style.borderLeftColor = '#DC2626';
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            )}
          </nav>

          <div style={{ margin: '16px 12px 0', background: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <GraduationCap size={28} style={{ color: '#F97316', marginBottom: 6 }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: '#000000', margin: '0 0 2px' }}>CSD &amp; CSIT</p>
            <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>Learn • Build • Lead</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', minWidth: 0 }}
          className="main-content"
        >
          {/* Greeting header — only on dashboard home pages */}
          {(location.pathname === '/student' || location.pathname === '/student/' || location.pathname === '/faculty' || location.pathname === '/faculty/' || location.pathname === '/hod' || location.pathname === '/hod/' || location.pathname === '/admin' || location.pathname === '/admin/') && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#000000', margin: '0 0 4px' }}>
                  {greeting}, {firstName} 👋
                </h1>
                <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
                  Welcome to AttendEase – SRKR Engineering College
                </p>
              </div>
              <span className="student-portal-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: '#FFF7ED', border: '1px solid #FED7AA',
                fontSize: 12, fontWeight: 600, color: '#F97316',
              }}>
                <GraduationCap size={13} />
                {role === 'student' ? 'Student Portal' : role === 'faculty' ? 'Faculty Portal' : role === 'hod' ? 'HOD Portal' : 'Admin Portal'}
              </span>
            </div>
          )}

          {children}

          <div className="footer-line print:hidden" style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #EEF2F7', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
            © 2026 AttendEase • SRKR Engineering College, Bhimavaram. All rights reserved.
          </div>
        </motion.main>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE BOTTOM TAB BAR (Hidden in Viewer Mode)
      ═══════════════════════════════════════ */}
      {role !== 'viewer' && (
        <nav className="mobile-bottom-nav print:hidden" style={{
          display: 'none',
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 68, background: '#ffffff',
          borderTop: '1px solid #EEF2F7',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          alignItems: 'center', justifyContent: 'space-around',
          padding: '0 8px 4px',
        }}>
          {(role === 'admin' ? adminMobileBottomNav : role === 'hod' ? hodMobileBottomNav : role === 'faculty' ? facultyMobileBottomNav : studentMobileBottomNav).map(item => {
            if (item.type === 'fab') {
              // Centre + FAB button -> Navigates to /student/new-request
              return (
                <button
                  key="fab"
                  onClick={() => navigate(item.to || '/student/new-request')}
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 18px rgba(249,115,22,0.40)',
                    marginBottom: 10,
                  }}
                >
                  <Plus size={24} style={{ color: '#fff' }} />
                </button>
              );
            }

            const Icon = item.icon!;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.id}
                to={item.to!}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  textDecoration: 'none', position: 'relative',
                  padding: '6px 12px', borderRadius: 12,
                  color: active ? '#F97316' : '#94A3B8',
                  transition: 'color 0.15s ease',
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                {item.hasBadge && unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 12, width: 7, height: 7, borderRadius: '50%', background: '#F97316', border: '1px solid #fff' }} />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        /* ── Screen Mobile ── */
        @media screen and (max-width: 768px) {
          .desktop-topbar   { display: none !important; }
          .desktop-sidebar  { display: none !important; }
          .mobile-topbar    { display: flex !important; }
          .mobile-bottom-nav{ display: ${role === 'viewer' ? 'none' : 'flex'} !important; }
          .main-content     { padding: ${role === 'viewer' ? '16px 16px 24px' : '16px 16px 88px'} !important; }
          .student-portal-badge { display: none !important; }
        }
        /* ── Screen Desktop ── */
        @media screen and (min-width: 769px) {
          .desktop-topbar   { display: flex !important; }
          .desktop-sidebar  { display: flex !important; }
          .mobile-topbar    { display: none !important; }
          .mobile-bottom-nav{ display: none !important; }
        }
        /* ── Print ── */
        @media print {
          .desktop-topbar, .mobile-topbar, .desktop-sidebar, .mobile-bottom-nav, .footer-line {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
