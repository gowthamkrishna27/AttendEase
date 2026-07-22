import { useNavigate, Link } from 'react-router-dom';
import {
  Check, Play, ArrowRight, Shield, Users, Clock, FileCheck,
  GraduationCap, BookOpen, ShieldCheck, Mail, Phone, MapPin,
  Menu, X
} from 'lucide-react';

const FacebookSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const LinkedinSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
import { useState } from 'react';
import srkrEmblem from '../assets/srkr-emblem.png';

const featuresList = [
  { icon: Shield,    title: 'Secure & Reliable', desc: 'Your data is protected with top security.' },
  { icon: Users,     title: 'Role-based Access', desc: 'Students, Faculty & HOD with different dashboards.' },
  { icon: Clock,     title: 'Real-time Updates', desc: 'Track your requests in real-time.' },
  { icon: FileCheck, title: 'Paperless Workflow', desc: 'No more paperwork. Everything digital.' },
];

const rolesList = [
  {
    role: 'For Students',
    icon: GraduationCap,
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.08)',
    bullets: ['Submit permission requests', 'Upload supporting documents', 'Track request status'],
  },
  {
    role: 'For Faculty',
    icon: BookOpen,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.08)',
    bullets: ['Review and approve requests', 'Add remarks and comments', 'Notify students instantly'],
  },
  {
    role: 'For HOD',
    icon: ShieldCheck,
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.08)',
    bullets: ['Final approval authority', 'View analytics and reports', 'Ensure academic discipline'],
  },
];

const stepsList = [
  { step: '1', title: 'Submit Request', desc: 'Fill the form and upload necessary documents.' },
  { step: '2', title: 'Faculty Review', desc: 'Faculty reviews and provides recommendations.' },
  { step: '3', title: 'HOD Approval', desc: 'HOD gives final approval or raises a query.' },
  { step: '4', title: 'Attendance Updated', desc: 'Approved permissions are recorded automatically.' },
];

const statsList = [
  { value: '10K+', label: 'Requests Processed' },
  { value: '95%',  label: 'Approval Rate' },
  { value: '300+', label: 'Active Faculty' },
  { value: '24/7', label: 'System Availability' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 70, background: 'rgba(255, 255, 255, 0.90)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEF2F7',
        display: 'flex', alignItems: 'center', padding: '0 5%',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={srkrEmblem} alt="SRKR Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
              <span style={{ color: '#000000' }}>Attend</span>
              <span style={{ color: '#F97316' }}>Ease</span>
            </p>
            <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>SRKR Engineering College</p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: 28 }}>
          {['Home', 'Features', 'How It Works', 'Dashboard', 'Testimonials', 'Contact'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/ /g, '-')}`}
              style={{ fontSize: 14, fontWeight: 600, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F97316')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 22px', borderRadius: 12, border: '1.5px solid #000000',
              background: '#ffffff', color: '#000000', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#F97316'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#000000'; e.currentTarget.style.color = '#000000'; }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '11px 24px', borderRadius: 12, border: 'none',
              background: '#F97316',
              color: '#ffffff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.25)',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#000000'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Get Started
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          className="mobile-trigger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 70, left: 0, right: 0, bottom: 0,
          background: '#ffffff', zIndex: 90, display: 'flex', flexDirection: 'column',
          padding: 24, gap: 16, borderTop: '1px solid #EEF2F7'
        }}>
          {['Home', 'Features', 'How It Works', 'Dashboard', 'Testimonials', 'Contact'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: 16, fontWeight: 700, color: '#000000', textDecoration: 'none', padding: '8px 0' }}
            >
              {link}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto', paddingBottom: 40 }}>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid #000000', background: '#ffffff', color: '#000000', fontSize: 14, fontWeight: 700 }}
            >
              Login
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: '#F97316', color: '#ffffff', fontSize: 14, fontWeight: 700 }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════ */}
      <section id="home" style={{ padding: '80px 5% 60px', display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Left Side Info */}
        <div style={{ flex: '1 1 500px', minWidth: 320 }}>
          <span style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 20,
            background: 'rgba(249,115,22,0.08)', color: '#F97316',
            fontSize: 12, fontWeight: 700, marginBottom: 20,
          }}>
            🛡️ Smart Attendance Permission System
          </span>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 800, color: '#000000', lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-1px' }}>
            Attendance Permissions,<br />
            Made <span style={{ color: '#F97316' }}>Effortless</span>.
          </h1>
          <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 460 }}>
            A modern platform for students to request, track and get attendance permissions with ease.
          </p>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            {['Easy Request Submission', 'Real-time Tracking', 'Faster Approvals'].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={12} style={{ color: '#F97316' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14, border: 'none',
                background: '#F97316',
                color: '#ffffff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 18px rgba(249,115,22,0.30)',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#000000'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Get Started
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14, border: '1.5px solid #000000',
                background: '#ffffff', color: '#000000', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#F97316'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#000000'; e.currentTarget.style.color = '#000000'; }}
            >
              <Play size={14} fill="currentColor" />
              View Demo
            </button>
          </div>
        </div>

        {/* Right Side: Live HTML/CSS render of Arjun Sharma's student dashboard */}
        <div style={{ flex: '1 1 500px', minWidth: 320, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          
          {/* Main Dashboard Window Mockup */}
          <div style={{
            width: '90%', maxWidth: 480, height: 400, background: '#ffffff',
            borderRadius: 20, border: '1px solid #EEF2F7',
            boxShadow: '0 20px 50px rgba(13,27,42,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              height: 52, borderBottom: '1px solid #EEF2F7', display: 'flex',
              alignItems: 'center', padding: '0 16px', background: '#ffffff'
            }}>
              <Menu size={16} style={{ color: '#94A3B8', marginRight: 12 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#000000' }}>Dashboard</span>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: 18, background: '#F8FAFC', overflowY: 'auto' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#000000', margin: '0 0 2px' }}>Hello, Arjun Sharma 👋</p>
              <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 16px' }}>Welcome back to AttendEase</p>

              {/* Stats Grid inside Mockup */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Total', value: '3', color: '#F97316', bg: 'rgba(249,115,22,0.06)' },
                  { label: 'Pending', value: '1', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
                  { label: 'Approved', value: '2', color: '#10B981', bg: 'rgba(16,185,129,0.06)' },
                  { label: 'Rejected', value: '0', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#ffffff', border: '1px solid #EEF2F7', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                      <span style={{ fontSize: 8, color: s.color }}>📁</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#000000', margin: '0 0 1px' }}>{s.value}</p>
                    <p style={{ fontSize: 8, color: '#94A3B8', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Requests list */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#000000' }}>Recent Requests</span>
                <span style={{ fontSize: 9, color: '#F97316', fontWeight: 600 }}>View All</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { title: 'Medical Leave', date: '14 Jul 2024', status: 'pending' },
                  { title: 'Sports Event', date: '12 Jul 2024', status: 'approved' },
                  { title: 'Workshop', date: '10 Jul 2024', status: 'approved' },
                ].map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', border: '1px solid #EEF2F7', borderRadius: 10, padding: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(249,115,22,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9 }}>📄</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#000000', margin: '0 0 1px' }}>{req.title}</p>
                      <p style={{ fontSize: 8, color: '#94A3B8', margin: 0 }}>{req.date}</p>
                    </div>
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                      background: req.status === 'pending' ? '#FEF3C7' : '#D1FAE5',
                      color: req.status === 'pending' ? '#D97706' : '#059669'
                    }}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Mobile Phone Mockup Overlay */}
          <div style={{
            position: 'absolute', bottom: -30, right: 0, width: 140, height: 280,
            background: '#ffffff', border: '6px solid #000000', borderRadius: 24,
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Mobile notch */}
            <div style={{ width: 50, height: 12, background: '#000000', alignSelf: 'center', borderRadius: '0 0 6px 6px', marginBottom: 6 }} />
            
            {/* Mobile Content */}
            <div style={{ flex: 1, padding: 8, background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 8, fontWeight: 800 }}>My Requests</span>
                <span style={{ fontSize: 6, color: '#94A3B8' }}>Filter</span>
              </div>

              {/* Circle graph */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%', border: '4px solid #EEF2F7',
                margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', position: 'relative'
              }}>
                <span style={{ fontSize: 10, fontWeight: 800 }}>3</span>
                <span style={{ fontSize: 5, color: '#94A3B8' }}>Total</span>
              </div>

              {/* Key indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 6, color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🟠 Pending</span>
                  <strong style={{ color: '#000000' }}>1</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🟢 Approved</span>
                  <strong style={{ color: '#000000' }}>2</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🔴 Rejected</span>
                  <strong style={{ color: '#000000' }}>0</strong>
                </div>
              </div>

              {/* Mobile FAB */}
              <div style={{ marginTop: 24, background: '#F97316', color: '#ffffff', borderRadius: 8, padding: '4px 6px', textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 8, fontWeight: 700 }}>+ New Request</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════
          TRUST ROW
      ═══════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid #EEF2F7', borderBottom: '1px solid #EEF2F7', background: '#ffffff', padding: '40px 5%' }}>
        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 28 }}>
          Trusted by students and faculty at SRKR Engineering College
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {featuresList.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(249,115,22,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color: '#F97316' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#000000', margin: '0 0 3px' }}>{title}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.45 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES SECTION
      ═══════════════════════════════════════ */}
      <section id="features" style={{ padding: '80px 5% 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#000000', margin: '0 0 8px' }}>Powerful Features for Everyone</h2>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>Built to simplify the entire permission management process</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
          {rolesList.map(({ role, icon: Icon, color, bg, bullets }) => (
            <div key={role} style={{
              background: '#ffffff', borderRadius: 18, border: '1px solid #EEF2F7',
              boxShadow: '0 10px 30px rgba(13,27,42,0.04)', padding: '32px 28px',
            }}>
              {/* Icon / Role Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#000000', margin: 0 }}>{role}</h3>
              </div>

              {/* Bullet points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {bullets.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={14} style={{ color }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>{b}</span>
                  </div>
                ))}
              </div>

              {/* Learn More link */}
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none', border: 'none', color, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0
                }}
              >
                Learn More
                <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: '#ffffff', borderTop: '1px solid #EEF2F7', borderBottom: '1px solid #EEF2F7', padding: '80px 5%' }}>
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#000000', margin: '0 0 8px' }}>How It Works</h2>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>A simple 4-step process for quick permissions</p>
        </div>

        <div className="steps-container" style={{ display: 'flex', gap: 24, justifyContent: 'space-between', flexWrap: 'wrap', position: 'relative' }}>
          {stepsList.map(({ step, title, desc }) => (
            <div key={step} style={{ flex: '1 1 200px', minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
              
              {/* Step indicator bubble */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#F8FAFC',
                border: '2.5px solid #F97316', color: '#F97316', fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                zIndex: 2,
              }}>
                {step}
              </div>

              {/* Title & Desc */}
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#000000', margin: '0 0 6px' }}>{title}</h4>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.45, maxWidth: 220 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          METRICS / STATS
      ═══════════════════════════════════════ */}
      <section style={{ padding: '60px 5% 50px', background: '#F8FAFC' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {statsList.map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center', padding: '12px 10px' }}>
              <p style={{ fontSize: 38, fontWeight: 800, color: '#F97316', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA BANNER
      ═══════════════════════════════════════ */}
      <section style={{ padding: '60px 5%' }}>
        <div style={{
          background: 'linear-gradient(135deg, #000000 0%, #1E293B 100%)',
          borderRadius: 24, padding: '48px 40px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24,
          boxShadow: '0 12px 30px rgba(13,27,42,0.15)',
        }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>Ready to simplify attendance permissions?</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Join AttendEase today and experience the difference.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none',
                background: '#F97316', color: '#ffffff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#000000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.4)',
                background: 'transparent', color: '#ffffff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer id="contact" style={{ background: '#ffffff', borderTop: '1px solid #EEF2F7', padding: '60px 5% 30px' }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 40 }}>
          
          {/* Logo & Description */}
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src={srkrEmblem} alt="SRKR Logo" style={{ width: 36, height: 36 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
                  <span style={{ color: '#000000' }}>Attend</span>
                  <span style={{ color: '#F97316' }}>Ease</span>
                </p>
                <p style={{ fontSize: 9, color: '#94A3B8', margin: 0 }}>SRKR Engineering College</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              A smart attendance permission management system for students, faculty and administrators.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 800, color: '#000000', margin: '0 0 16px', textTransform: 'uppercase' }}>Quick Links</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Home', 'Features', 'How It Works', 'Dashboard'].map(link => (
                <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 12, color: '#64748B', textDecoration: 'none' }}>{link}</a>
              ))}
            </div>
          </div>

          {/* Resources Column */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 800, color: '#000000', margin: '0 0 16px', textTransform: 'uppercase' }}>Resources</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Help Center', 'Privacy Policy', 'Terms of Service', 'Contact Us'].map(res => (
                <a key={res} href="#" style={{ fontSize: 12, color: '#64748B', textDecoration: 'none' }}>{res}</a>
              ))}
            </div>
          </div>

          {/* Contact info column */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 800, color: '#000000', margin: '0 0 16px', textTransform: 'uppercase' }}>Contact</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={13} style={{ color: '#F97316' }} />
                <span>Bhimavaram, Andhra Pradesh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={13} style={{ color: '#F97316' }} />
                <span>+91 98765 43210</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={13} style={{ color: '#F97316' }} />
                <span>support@attendease.srkrec.ac.in</span>
              </div>
            </div>
            
            {/* Social media icons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {[FacebookSVG, InstagramSVG, LinkedinSVG].map((Icon, idx) => (
                <a key={idx} href="#" style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8FAFC', border: '1px solid #EEF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* copyright and divider */}
        <div style={{ borderTop: '1px solid #EEF2F7', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
            © {new Date().getFullYear()} AttendEase - SRKR Engineering College. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Responsive custom style injections */}
      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @media (max-width: 768px) {
          .desktop-nav, .desktop-actions {
            display: none !important;
          }
          .mobile-trigger {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
