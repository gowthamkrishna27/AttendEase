import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, IdCard, Building2, GraduationCap, Activity,
  Pencil, Camera, Mail, Phone, CalendarDays, MapPin,
  ChevronRight, Lock, CheckCircle2, Circle, Lightbulb,
  Users, BookOpen, ClipboardList,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { mockStudent } from '../../data/mock';
import srkrEmblem from '../../assets/srkr-emblem.png';
import { useAuth } from '../../context/AuthContext';

/* ── Shared style helpers ── */
const card = (extra: object = {}): React.CSSProperties => ({
  background: '#ffffff',
  borderRadius: 20,
  border: '1px solid #EEF2F7',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  ...extra,
});
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  height: 44, padding: '0 14px 0 38px',
  fontSize: 14, color: '#1E293B',
  background: '#F8FAFC', border: '1.5px solid #E8EDF2',
  borderRadius: 12, outline: 'none',
  fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151',
  marginBottom: 6, display: 'block', letterSpacing: '0.01em',
};
const icoWrap: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%',
  transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none',
};

const TABS = ['Personal Information', 'Academic Information', 'Account Settings'] as const;
type Tab = typeof TABS[number];

/* ── Circular progress SVG ── */
function CircularProgress({ pct }: { pct: number }) {
  const r = 46, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={60} cy={60} r={r} fill="none" stroke="#EEF2F7" strokeWidth={10} />
      <circle
        cx={60} cy={60} r={r} fill="none"
        stroke="#F97316" strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Personal Information');

  /* editable fields */
  const [fullName, setFullName]   = useState(mockStudent.name);
  const [email, setEmail]         = useState(mockStudent.email);
  const [phone, setPhone]         = useState('+91 98765 43210');
  const [dob, setDob]             = useState('21 Jan 2005');
  const [gender, setGender]       = useState('Male');
  const [address, setAddress]     = useState('Bhimavaram, Andhra Pradesh, India');

  const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#F97316';
    e.target.style.boxShadow   = '0 0 0 3px rgba(249,115,22,0.09)';
    e.target.style.background  = '#fff';
  };
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E8EDF2';
    e.target.style.boxShadow   = 'none';
    e.target.style.background  = '#F8FAFC';
  };

  const completion = [
    { label: 'Personal Information', done: true  },
    { label: 'Academic Information', done: true  },
    { label: 'Profile Photo',        done: true  },
    { label: 'Account Settings',     done: false },
  ];

  return (
    <PageWrapper role="student">

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 13, color: '#94A3B8' }}>
        <Link to="/student" style={{ color: '#F97316', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
        <ChevronRight size={13} />
        <span style={{ color: '#64748B' }}>Profile</span>
      </div>

      {/* ── Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        style={{
          ...card({ padding: '28px 32px', marginBottom: 24 }),
          background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, #F0F9FF 50%, #F8FAFC 100%)',
          display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
        }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: user?.avatarUrl || mockStudent.avatarUrl ? 100 : 100,
            height: user?.avatarUrl || mockStudent.avatarUrl ? 125 : 100,
            borderRadius: user?.avatarUrl || mockStudent.avatarUrl ? 12 : '50%',
            background: '#ffffff',
            border: user?.avatarUrl || mockStudent.avatarUrl ? '1.5px solid #E2E8F0' : '3px solid #fff',
            boxShadow: user?.avatarUrl || mockStudent.avatarUrl ? '0 4px 12px rgba(0,0,0,0.06)' : '0 4px 20px rgba(37,99,235,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {user?.avatarUrl || mockStudent.avatarUrl ? (
              <img src={user?.avatarUrl || mockStudent.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={srkrEmblem} alt="Avatar" style={{ width: 54, height: 54, objectFit: 'contain', opacity: 0.5 }} />
            )}
          </div>
          <button style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 28, height: 28, borderRadius: '50%',
            background: '#F97316', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Camera size={12} style={{ color: '#fff' }} />
          </button>
        </div>

        {/* Name + Info chips */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>{mockStudent.name}</h1>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: 'rgba(249,115,22,0.1)', color: '#F97316', fontSize: 12, fontWeight: 700, marginBottom: 16,
          }}>Student</span>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {[
              { icon: IdCard,       label: 'Roll Number', value: mockStudent.rollNumber },
              { icon: Building2,    label: 'Department',  value: 'CSE' },
              { icon: GraduationCap,label: 'Year',        value: 'III Year' },
              { icon: Activity,     label: 'Status',      value: 'Active', green: true },
            ].map(({ icon: Icon, label, value, green }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} style={{ color: green ? '#10B981' : '#64748B' }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: green ? '#10B981' : '#0F172A', margin: '0 0 1px' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit button */}
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          color: '#F97316', background: '#fff', border: '1.5px solid rgba(249,115,22,0.2)',
          cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 1px 6px rgba(37,99,235,0.10)',
        }}>
          <Pencil size={13} />
          Edit Profile
        </button>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.05 }}
        style={{ ...card({ padding: '0 32px', marginBottom: 24 }) }}
      >
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #EEF2F7' }}>
          {TABS.map(t => {
            const isActive = tab === t;
            const icons: Record<Tab, React.ElementType> = {
              'Personal Information': User,
              'Academic Information': GraduationCap,
              'Account Settings':     ClipboardList,
            };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '16px 20px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#F97316' : '#64748B',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #F97316' : '2px solid transparent',
                  marginBottom: -1, whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {t}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}
      >

        {/* Left: Form */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {tab === 'Personal Information' && (
            <div style={{ ...card({ padding: '24px 28px' }) }}>

              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={icoWrap} />
                    <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Roll Number</label>
                  <div style={{ position: 'relative' }}>
                    <IdCard size={14} style={icoWrap} />
                    <input value={mockStudent.rollNumber} readOnly style={{ ...inputStyle, color: '#94A3B8' }} />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={icoWrap} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={icoWrap} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <div style={{ position: 'relative' }}>
                    <CalendarDays size={14} style={icoWrap} />
                    <input value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <div style={{ position: 'relative' }}>
                    <Users size={14} style={icoWrap} />
                    <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }} onFocus={focusIn} onBlur={focusOut}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Address */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={icoWrap} />
                  <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              <button style={{
                padding: '10px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.28)',
              }}>
                Save Changes
              </button>
            </div>
          )}

          {tab === 'Academic Information' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...card({ padding: '24px 28px' }) }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>Academic Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {[
                    { icon: Building2,     label: 'Department',    value: 'Computer Science & Engineering' },
                    { icon: GraduationCap, label: 'Year of Study', value: 'III Year' },
                    { icon: CalendarDays,  label: 'Academic Batch', value: '2023 – 2027' },
                    { icon: Users,         label: 'Section',        value: 'CSE - A' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', borderRadius: 13,
                      background: '#F8FAFC', border: '1px solid #EEF2F7',
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={17} style={{ color: '#F97316' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px', fontWeight: 500 }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'Account Settings' && (
            <div style={{ ...card({ padding: '24px 28px' }) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Account Settings</h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Change your account password and security settings.</p>
                </div>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#F97316', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
                  cursor: 'pointer',
                }}>
                  <Lock size={13} />
                  Change Password
                </button>
              </div>

              <div style={{ marginTop: 24, padding: '20px', borderRadius: 13, background: '#F8FAFC', border: '1px solid #EEF2F7' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={icoWrap} />
                      <input type="password" placeholder="Enter current password" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={icoWrap} />
                      <input type="password" placeholder="Enter new password" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile Completion */}
          <div style={{ ...card({ padding: '20px' }) }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 16px' }}>Profile Completion</h3>

            {/* Circular progress */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 16 }}>
              <CircularProgress pct={85} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>85%</p>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>Complete</p>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completion.map(({ label, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {done
                    ? <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                    : <Circle size={14} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 12, color: done ? '#374151' : '#94A3B8', fontWeight: done ? 500 : 400 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tip card */}
          <div style={{
            borderRadius: 14, padding: '14px 16px',
            background: '#FFFBEB', border: '1px solid #FDE68A',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Lightbulb size={14} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Tip</span>
            </div>
            <p style={{ fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.5 }}>
              Complete your profile to get the best experience.
            </p>
          </div>

        </div>
      </motion.div>

      {/* ── Academic Info (always visible below) ── */}
      {tab === 'Personal Information' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: 0.1 }}
          style={{ ...card({ padding: '24px 28px', marginTop: 24 }) }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>Academic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { icon: Building2,     label: 'Department',     value: 'Computer Science & Engineering' },
              { icon: GraduationCap, label: 'Year of Study',  value: 'III Year' },
              { icon: CalendarDays,  label: 'Academic Batch', value: '2023 – 2027' },
              { icon: BookOpen,      label: 'Section',        value: 'CSE - A' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color: '#F97316' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 2px', fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Account Settings strip (always visible) ── */}
      {tab === 'Personal Information' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: 0.14 }}
          style={{ ...card({ padding: '20px 28px', marginTop: 16 }), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 3px' }}>Account Settings</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Change your account password and security settings.</p>
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            color: '#F97316', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
            cursor: 'pointer',
          }}>
            <Lock size={13} />
            Change Password
          </button>
        </motion.div>
      )}

    </PageWrapper>
  );
}
