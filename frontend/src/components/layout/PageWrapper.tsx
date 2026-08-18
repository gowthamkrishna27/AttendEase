import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Clock, User, LogOut, LogIn,
  Bell, GraduationCap, Plus,
  ClipboardList, Users, BarChart2, Settings, Shield,
  CheckSquare, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

interface PageWrapperProps {
  children: ReactNode;
  role?: 'student' | 'faculty' | 'hod' | 'admin' | 'viewer';
  showGreeting?: boolean;
}

const viewerNav: { to: string; label: string; icon: any }[] = [];

const studentNav = [
  { to: '/student', label: 'Home', icon: Home },
  { to: '/student/new-request', label: 'New Request', icon: Plus },
  { to: '/student/history', label: 'History', icon: Clock },
  { to: '/student/profile', label: 'Profile', icon: User },
];
const facultyNav = [
  { to: '/faculty',          label: 'Dashboard',     icon: Home          },
  { to: '/faculty/attendance', label: 'Mark Attendance', icon: CheckSquare },
  { to: '/faculty/requests', label: 'Requests',      icon: ClipboardList },
  { to: '/faculty/students', label: 'Students',      icon: Users         },
  { to: '/faculty/reports',  label: 'Reports',       icon: BarChart2     },
  { to: '/faculty/settings', label: 'Settings',      icon: Settings      },
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
  { to: '/admin',            label: 'Dashboard',       icon: Home      },
  { to: '/admin/users',      label: 'User & Students', icon: Users     },
  { to: '/admin/counseling', label: 'Counseling Assign', icon: UserCheck },
  { to: '/admin/settings',   label: 'Settings',        icon: Settings  },
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
  { id: 'attendance', to: '/faculty/attendance', label: 'Attendance', icon: CheckSquare, type: 'link' },
  { id: 'requests', to: '/faculty/requests', label: 'Requests', icon: ClipboardList, type: 'link' },
  { id: 'students', to: '/faculty/students', label: 'Students', icon: Users, type: 'link' },
  { id: 'reports', to: '/faculty/reports', label: 'Reports', icon: BarChart2, type: 'link' },
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
  { id: 'counseling', to: '/admin/counseling', label: 'Counseling', icon: UserCheck, type: 'link' },
  { id: 'settings', to: '/admin/settings', label: 'Settings', icon: Settings, type: 'link' },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function PageWrapper({ children, role = 'student' }: PageWrapperProps) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    localStorage.removeItem('attendease_theme');
    document.documentElement.classList.remove('dark');
  }, []);

  const unreadCount = 0;

  const navLinks = role === 'viewer' ? viewerNav : role === 'student' ? studentNav : role === 'faculty' ? facultyNav : role === 'hod' ? hodNav : adminNav;
  const homeLink = role === 'viewer' ? '/permissions' : role === 'student' ? '/student' : role === 'faculty' ? '/faculty' : role === 'hod' ? '/hod' : '/admin';

  const handleLogout = () => { logout(); navigate('/'); };

  const hour = new Date().getHours();
  const firstName = user?.name?.split(' ')[0] ?? 'User';
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

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
        <Link to={homeLink} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
          <img src={logo} alt="SRKR" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.15 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>SRKR Engineering College</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: 0 }}>CSD &amp; CSIT</p>
          </div>
        </Link>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Settings or Plus button in top navbar */}
          {user && user.role !== 'student' && (
            <Link
              to={user.role === 'admin' ? '/admin/users' : `/${user.role}/settings`}
              title={user.role === 'admin' ? 'Add User' : 'Settings'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 12, background: '#FFF7ED',
                border: '1.5px solid #FED7AA', color: '#EA580C', textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
            >
              {user.role === 'admin' ? <Plus size={18} /> : <Settings size={17} />}
            </Link>
          )}

          {/* Show Login or User Profile/Dashboard button */}
          {!user ? (
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 14px', fontSize: 13, fontWeight: 700,
                color: '#EA580C', background: '#FFF7ED',
                border: '1.5px solid #FED7AA',
                borderRadius: 12, textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(249,115,22,0.12)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
            >
              <LogIn size={15} />
              <span>Login</span>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user.role === 'student' || user.role === 'faculty' || user.role === 'hod' ? (
                location.pathname === '/permissions' ? (
                  <Link
                    to={`/${user.role}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '6px 14px', fontSize: 13, fontWeight: 700,
                      color: '#EA580C', background: '#FFF7ED',
                      border: '1.5px solid #FED7AA',
                      borderRadius: 12, textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(249,115,22,0.12)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
                  >
                    <Home size={15} />
                    <span>{user.role === 'student' ? 'Student Portal' : user.role === 'faculty' ? 'Faculty Portal' : 'HOD Portal'}</span>
                  </Link>
                ) : (
                  <Link
                    to="/permissions"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '6px 14px', fontSize: 13, fontWeight: 700,
                      color: '#EA580C', background: '#FFF7ED',
                      border: '1.5px solid #FED7AA',
                      borderRadius: 12, textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(249,115,22,0.12)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
                  >
                    <Shield size={15} />
                    <span>View Permissions</span>
                  </Link>
                )
              ) : (
                <Link
                  to={`/${user.role}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '6px 14px', fontSize: 13, fontWeight: 700,
                    color: '#EA580C', background: '#FFF7ED',
                    border: '1.5px solid #FED7AA',
                    borderRadius: 12, textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(249,115,22,0.12)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
                >
                  <User size={15} />
                  <span style={{ textTransform: 'capitalize' }}>{user.name?.split(' ')[0] || user.role}</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10, background: '#FEF2F2',
                  border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
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
        <Link to={homeLink} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={logo} alt="SRKR" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.15 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>SRKR Engineering College</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0 }}>CSD &amp; CSIT</p>
          </div>
        </Link>

        {/* Center/Right: Settings + Login Button (mobile) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Settings or Plus button in mobile top bar */}
          {user && user.role !== 'student' && user.role !== 'hod' && (
            <Link
              to={user.role === 'admin' ? '/admin/users' : `/${user.role}/settings`}
              title={user.role === 'admin' ? 'Add User' : 'Settings'}
              style={{
                width: 30, height: 30, borderRadius: 8, background: '#FFF7ED',
                border: '1.5px solid #FED7AA', color: '#EA580C', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {user.role === 'admin' ? <Plus size={16} /> : <Settings size={15} />}
            </Link>
          )}

          {!user ? (
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 10px', fontSize: 12, fontWeight: 700,
                color: '#EA580C', background: '#FFF7ED', border: '1.5px solid #FED7AA',
                borderRadius: 8, textDecoration: 'none',
                boxShadow: '0 1px 4px rgba(249,115,22,0.10)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
            >
              <LogIn size={13} />
              <span>Login</span>
            </Link>
          ) : user.role === 'student' || user.role === 'faculty' || user.role === 'hod' ? (
            location.pathname === '/permissions' ? (
              <Link
                to={`/${user.role}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '5px 10px', fontSize: 12, fontWeight: 700,
                  color: '#EA580C', background: '#FFF7ED', border: '1.5px solid #FED7AA',
                  borderRadius: 8, textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(249,115,22,0.10)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
              >
                <Home size={13} />
                <span>{user.role === 'student' ? 'Student Portal' : user.role === 'faculty' ? 'Faculty Portal' : 'HOD Portal'}</span>
              </Link>
            ) : (
              <Link
                to="/permissions"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '5px 10px', fontSize: 12, fontWeight: 700,
                  color: '#EA580C', background: '#FFF7ED', border: '1.5px solid #FED7AA',
                  borderRadius: 8, textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(249,115,22,0.10)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
              >
                <Shield size={13} />
                <span>View Permissions</span>
              </Link>
            )
          ) : (
            <Link
              to={`/${user.role}`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 10px', fontSize: 12, fontWeight: 700,
                color: '#EA580C', background: '#FFF7ED', border: '1.5px solid #FED7AA',
                borderRadius: 8, textDecoration: 'none',
                boxShadow: '0 1px 4px rgba(249,115,22,0.10)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
            >
              <User size={13} />
              <span style={{ textTransform: 'capitalize' }}>{user.name?.split(' ')[0] || user.role}</span>
            </Link>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════
          BODY: SIDEBAR + MAIN
      ═══════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── DESKTOP SIDEBAR ── */}
        {navLinks.length > 0 && (
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
        )}

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
          {(routerLocation.pathname === '/student' || routerLocation.pathname === '/student/' || routerLocation.pathname === '/faculty' || routerLocation.pathname === '/faculty/' || routerLocation.pathname === '/hod' || routerLocation.pathname === '/hod/' || routerLocation.pathname === '/admin' || routerLocation.pathname === '/admin/') && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {greeting}, {user?.name || firstName}
                </h1>
                <p style={{ fontSize: 13.5, color: '#64748B', margin: 0, fontWeight: 500 }}>
                  Welcome to AttendEase • SRKR Engineering College
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
          height: 64, background: '#ffffff',
          borderTop: '1px solid #EEF2F7',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 4px calc(env(safe-area-inset-bottom, 0px) + 2px)',
        }}>
          {(role === 'admin' ? adminMobileBottomNav : role === 'hod' ? hodMobileBottomNav : role === 'faculty' ? facultyMobileBottomNav : studentMobileBottomNav).map(item => {
            if (item.type === 'fab') {
              // Centre + FAB button -> Navigates to /student/new-request
              return (
                <div key="fab" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    onClick={() => navigate(item.to || '/student/new-request')}
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                      border: '3px solid #ffffff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(249,115,22,0.45)',
                      transform: 'translateY(-12px)',
                    }}
                  >
                    <Plus size={24} style={{ color: '#fff' }} />
                  </button>
                </div>
              );
            }

            const Icon = item.icon!;
            const isRootPage = item.to === '/student' || item.to === '/faculty' || item.to === '/hod' || item.to === '/admin';
            const active = isRootPage
              ? (routerLocation.pathname === item.to || routerLocation.pathname === `${item.to}/`)
              : routerLocation.pathname.startsWith(item.to!);
            return (
              <div key={item.id} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                <Link
                  to={item.to!}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    textDecoration: 'none', position: 'relative',
                    padding: '6px 0', width: '100%',
                    color: active ? '#F97316' : '#94A3B8',
                    transition: 'color 0.15s ease',
                  }}
                >
                  <Icon size={20} />
                  <span style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}>
                    {item.label}
                  </span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 14px)', width: 7, height: 7, borderRadius: '50%', background: '#F97316', border: '1px solid #fff' }} />
                  )}
                </Link>
              </div>
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
