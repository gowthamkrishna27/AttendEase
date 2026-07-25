import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, ShieldCheck,
  Eye, EyeOff, Lock, User,
  ArrowRight, Info, Shield, Clock, Users, Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';
import srkrEmblem from '../../assets/srkr-emblem.png';
import campusImg from '../../assets/campus.png';

type Tab = 'student' | 'faculty' | 'hod';

const TABS: { key: Tab; label: string; icon: typeof GraduationCap }[] = [
  { key: 'student', label: 'Student', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', icon: BookOpen },
  { key: 'hod', label: 'HOD', icon: ShieldCheck },
];

export default function LoginPortal() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab); setIdentifier(''); setPassword(''); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    try {
      const role: UserRole = activeTab;
      await login(identifier.trim(), password, role);
      navigate(activeTab === 'student' ? '/student' : activeTab === 'faculty' ? '/faculty' : '/hod');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Shared form section (used in both desktop right panel & mobile card) ── */
  const renderForm = () => (
    <>
      {/* Avatar + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
        <h2 className="login-heading" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 5px' }}>
          Welcome Back!
        </h2>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Sign in to your account and continue</p>
      </div>

      {/* Role tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: '#F8FAFC', border: '1px solid #E8EDF2',
        borderRadius: 16, padding: 6, marginBottom: 20,
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 6px', fontSize: 13, fontWeight: 600,
                borderRadius: 11, cursor: 'pointer',
                border: isActive ? '1.5px solid #F97316' : '1.5px solid #E2E8F0',
                background: isActive ? 'rgba(249,115,22,0.08)' : '#ffffff',
                color: isActive ? '#F97316' : '#64748B',
                boxShadow: isActive ? '0 1px 6px rgba(249,115,22,0.15)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.form
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16 }}
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {/* Identifier */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {activeTab === 'student' ? 'Roll Number' : 'Email Address'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
              <input
                type={activeTab === 'student' ? 'text' : 'email'}
                placeholder={activeTab === 'student' ? ' 24B91A0724' : 'name@college.edu'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete={activeTab === 'student' ? 'username' : 'email'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 46, paddingLeft: 38, paddingRight: 14,
                  fontSize: 14, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 12, outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 4px rgba(249,115,22,0.08)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 46, paddingLeft: 38, paddingRight: 42,
                  fontSize: 14, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 12, outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 4px rgba(249,115,22,0.08)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#64748B' }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#F97316' }} />
              Remember me
            </label>
            <button type="button" style={{ fontSize: 13, fontWeight: 600, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}>
              Forgot Password?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 13px' }}>
              {error}
            </div>
          )}

          {/* Sign In button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.01, y: isLoading ? 0 : -1 }}
            whileTap={{ scale: 0.985 }}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: '#F97316',
              color: '#fff', fontSize: 15, fontWeight: 700,
              border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 18px rgba(249,115,22,0.30)',
              opacity: isLoading ? 0.8 : 1,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#000000'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; }}
          >
            {isLoading
              ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : <><span>Sign In</span><ArrowRight size={16} /></>
            }
          </motion.button>
        </motion.form>
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* ── Responsive CSS ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Desktop: side-by-side card */
        .login-page   { min-height:100vh; width:100%; background:#EEF2F7; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 16px; font-family:'Inter','Segoe UI',system-ui,sans-serif; }
        .login-card   { width:100%; max-width:1020px; min-height:640px; display:flex; flex-direction:row; background:#fff; border-radius:28px; box-shadow:0 24px 60px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.05); overflow:hidden; border:1px solid #E8EDF2; }
        .login-left   { width:46%; flex-shrink:0; display:flex; flex-direction:column; background:#fff; }
        .login-right  { flex:1; background:#fff; display:flex; flex-direction:column; justify-content:space-between; padding:28px 44px 32px; }
        .login-mobile-top { display:none; }
        .login-footer { font-size:12px; color:#94A3B8; margin-top:20px; text-align:center; }
        .login-lightmode { display:flex; justify-content:flex-end; margin-bottom:16px; }

        /* Mobile: single column */
        @media (max-width: 767px) {
          .login-page  { background:#fff; padding:0; justify-content:flex-start; }
          .login-card  { flex-direction:column; border-radius:0; box-shadow:none; min-height:100vh; max-width:100%; border:none; background:transparent; }
          .login-left  { display:none; }
          .login-right { padding:20px 20px 32px; justify-content:flex-start; gap:0; background:#fff; }
          .login-mobile-top { display:flex; flex-direction:column; align-items:center; text-align:center; padding:36px 24px 24px; background:#fff; }
          .login-form-card  { background:#F8FAFC; border-radius:24px 24px 0 0; padding:24px 20px 36px; flex:1; box-shadow:0 -4px 24px rgba(0,0,0,0.06); }
          .login-footer { margin-top:16px; padding-bottom:24px; }
          .login-lightmode { display:none; }
          .login-heading { font-size:20px !important; }
        }
      `}</style>

      {/* ── Page ── */}
      <div className="login-page">

        {/* ── Mobile-only top header ── */}
        <div className="login-mobile-top">
          <img src={srkrEmblem} alt="SRKR" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 6 }} />
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 6px', letterSpacing: '0.06em' }}>Estd.1980</p>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.1 }}>
            <span style={{ color: '#0F172A' }}>Attend</span>
            <span style={{ color: '#F97316' }}>Ease</span>
          </h1>
          <p style={{ fontSize: 14, color: '#475569', margin: 0, fontWeight: 700 }}>SRKR Engineering College</p>
          <p style={{ fontSize: 14, color: '#475569', margin: '2px 0 0', fontWeight: 700 }}>CSD & CSIT</p>
        </div>

        {/* ── Main Card ── */}
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
        >

          {/* ══ LEFT PANEL (desktop only) ══ */}
          <div className="login-left">
            {/* White text area */}
            <div style={{ padding: '32px 32px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <img src={srkrEmblem} alt="SRKR" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.2 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>SRKR Engineering College</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: 0 }}>CSD & CSIT</p>
                </div>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', lineHeight: 1.15, margin: '0 0 6px' }}>
                Welcome to<br />
                <span style={{ color: '#F97316' }}>AttendEase</span>
              </h1>
              <div style={{ width: 40, height: 3, borderRadius: 99, background: '#F97316', margin: '12px 0 14px' }} />
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, margin: 0, maxWidth: 260 }}>
                Smart Attendance Management System for Students, Faculty &amp; Administration.
              </p>
            </div>

            {/* Campus photo */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 260 }}>
              <img
                src={campusImg}
                alt="SRKR Campus"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }} />

              {/* Feature cards */}
              <div style={{
                position: 'absolute', bottom: 18, left: 16, right: 16,
                background: 'rgba(15,23,42,0.80)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18,
                padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                {[
                  { icon: Shield, color: '#F97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.30)', title: 'Secure & Reliable', desc: 'Your data is protected with enterprise-grade security.' },
                  { icon: Clock, color: '#60A5FA', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.30)', title: 'Real-time Access', desc: 'Access attendance records anytime, anywhere.' },
                  { icon: Users, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.30)', title: 'Role-based Access', desc: 'Customized experience for students, faculty & HOD.' },
                ].map(({ icon: Icon, color, bg, border, title, desc }) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', margin: '0 0 2px' }}>{title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', margin: 0, lineHeight: 1.45 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ RIGHT PANEL / MOBILE CARD ══ */}
          <div className="login-right">
            {/* Desktop: Light Mode button */}
            <div className="login-lightmode">
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 12, fontWeight: 500,
                color: '#475569', background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <Sun size={13} style={{ color: '#F59E0B' }} />
                Light Mode
              </button>
            </div>

            {/* Mobile: form inside a rounded card */}
            <div className="login-form-card" style={{ flex: 1 }}>
              {renderForm()}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="login-footer">© 2026 AttendEase · SRKREC. All rights reserved.</p>
      </div>
    </>
  );
}
