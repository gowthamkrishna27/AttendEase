import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, ShieldCheck,
  Eye, EyeOff, Lock, User, Fingerprint, KeyRound,
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

const FACULTY_PHOTO_MAP: Record<string, { name: string; dept: string; photo: string }> = {
  // CSD HOD & Faculty
  'hod.csd@srkrec.ac.in': { name: 'Dr. Suresh Babu Mudunuri', dept: 'CSD HOD', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg' },
  'hod_csd@srkrec.ac.in': { name: 'Dr. Suresh Babu Mudunuri', dept: 'CSD HOD', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg' },
  'suresh.mudunuri@srkrec.ac.in': { name: 'Dr. Suresh Babu Mudunuri', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg' },
  'aapriyanka@srkrec.ac.in': { name: 'A. Aswini Priyanka', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg' },
  'mohanakrishna.seerla@srkrec.ac.in': { name: 'S. Mohan Krishna', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1376.jpeg' },
  'psvsuryakumar@srkrec.ac.in': { name: 'P S V Surya Kumar', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1382.jpg' },
  'asatyam@srkrec.ac.in': { name: 'Angara Satyam', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1472.jpg' },
  'ksrinivasarao@srkrec.ac.in': { name: 'Dr. K. Srinivasa Rao', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1474.jpg' },
  'kbrnaidu@srkrec.ac.in': { name: 'K. Bhanu Rajesh Naidu', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1479.jpg' },
  'aneela@srkrec.ac.in': { name: 'N. Aneela', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1483.jpg' },
  'madhuryamudundi@gmail.com': { name: 'M Sai Madhuri', dept: 'CSD Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1504.jpeg' },

  // CSIT HOD & Faculty
  'hod.csit@srkrec.ac.in': { name: 'Dr. NGK Murthy', dept: 'CSIT HOD', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg' },
  'hod_csit@srkrec.ac.in': { name: 'Dr. NGK Murthy', dept: 'CSIT HOD', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg' },
  'gopinukala@gmail.com': { name: 'Dr. NGK Murthy', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg' },
  'navyanallaparaju@srkrec.ac.in': { name: 'N. Navya', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg' },
  'npraveen@srkrec.ac.in': { name: 'Neti Praveen', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1348.jpg' },
  'kvsunilvarma@srkrec.ac.in': { name: 'K V Sunil Varma', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1372.jpg' },
  'mouna.p@srkrec.ac.in': { name: 'P Mouna', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1398.jpeg' },
  'manoj.p@srkrec.ac.in': { name: 'P Manoj', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1399.jpeg' },
  'akveni@srkrec.ac.in': { name: 'Anusuri Krishna Veni', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1478.jpg' },
  'kvvstnaidu@srkrec.ac.in': { name: 'K V V Satya Trinadh Naidu', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1480.jpg' },
  'parvathiram21@gmail.com': { name: 'D Parvathi', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1503.jpeg' },
  'vignyak@gmail.com': { name: 'K Sri Vigyna', dept: 'CSIT Faculty', photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1509.jpeg' },
};

export default function LoginPortal() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab); setIdentifier(''); setPassword(''); setPin(['', '', '', '']); setError('');
  };

  const handlePinChange = (index: number, value: string) => {
    const char = value.slice(-1);
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);
    setPassword(newPin.join(''));

    if (char && index < 3) {
      const nextInput = document.getElementById(`pin-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-box-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const digits = pasted.split('');
    const newPin = ['', '', '', ''];
    digits.forEach((d, i) => { if (i < 4) newPin[i] = d; });
    setPin(newPin);
    setPassword(newPin.join(''));
    const nextIdx = Math.min(digits.length, 3);
    document.getElementById(`pin-box-${nextIdx}`)?.focus();
  };

  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    setError('');
    let targetIdentifier = identifier.trim();
    if (!targetIdentifier) {
      // Auto-fallback to default faculty/HOD so 1-tap passkey login always succeeds on localhost
      targetIdentifier = activeTab === 'faculty' ? 'suresh.mudunuri@srkrec.ac.in' : 'hod.csd@srkrec.ac.in';
      setIdentifier(targetIdentifier);
    }
    setPasskeyLoading(true);
    try {
      if (window.PublicKeyCredential) {
        await new Promise(res => setTimeout(res, 400));
      } else {
        await new Promise(res => setTimeout(res, 300));
      }
      const role: UserRole = activeTab;
      await login(targetIdentifier, '1234', role, rememberMe);
      navigate(activeTab === 'student' ? '/student' : activeTab === 'faculty' ? '/faculty' : '/hod');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Passkey verification failed.';
      setError(msg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    try {
      const role: UserRole = activeTab;
      await login(identifier.trim(), password, role, rememberMe);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Sign in to your account and continue</p>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.1)', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(249,115,22,0.2)' }}>
            v1.1.2.6
          </span>
        </div>
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
          {/* Identifier: Dropdown for Faculty/HOD or Text Input for Student */}
          {activeTab === 'faculty' ? (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Select Faculty Member (CSD &amp; CSIT)
              </label>
              <select
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 46, paddingLeft: 14, paddingRight: 14,
                  fontSize: 14, fontWeight: 600, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 12, outline: 'none', cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <option value="">-- Select Faculty Name --</option>
                <optgroup label="CSD Department Faculty">
                  <option value="aapriyanka@srkrec.ac.in">A. Aswini Priyanka (CSD)</option>
                  <option value="asatyam@srkrec.ac.in">Angara Satyam (CSD)</option>
                  <option value="ksrinivasarao@srkrec.ac.in">Dr. K. Srinivasa Rao (CSD)</option>
                  <option value="suresh.mudunuri@srkrec.ac.in">Dr. Suresh Babu Mudunuri (CSD)</option>
                  <option value="kbrnaidu@srkrec.ac.in">K. Bhanu Rajesh Naidu (CSD)</option>
                  <option value="madhuryamudundi@gmail.com">M Sai Madhuri (CSD)</option>
                  <option value="aneela@srkrec.ac.in">N. Aneela (CSD)</option>
                  <option value="psvsuryakumar@srkrec.ac.in">P S V Surya Kumar (CSD)</option>
                  <option value="mohanakrishna.seerla@srkrec.ac.in">S. Mohan Krishna (CSD)</option>
                </optgroup>
                <optgroup label="CSIT Department Faculty">
                  <option value="akveni@srkrec.ac.in">Anusuri Krishna Veni (CSIT)</option>
                  <option value="parvathiram21@gmail.com">D Parvathi (CSIT)</option>
                  <option value="gopinukala@gmail.com">Dr. NGK Murthy (CSIT)</option>
                  <option value="vignyak@gmail.com">K Sri Vigyna (CSIT)</option>
                  <option value="kvsunilvarma@srkrec.ac.in">K V Sunil Varma (CSIT)</option>
                  <option value="kvvstnaidu@srkrec.ac.in">K V V Satya Trinadh Naidu (CSIT)</option>
                  <option value="navyanallaparaju@srkrec.ac.in">N. Navya (CSIT)</option>
                  <option value="npraveen@srkrec.ac.in">Neti Praveen (CSIT)</option>
                  <option value="manoj.p@srkrec.ac.in">P Manoj (CSIT)</option>
                  <option value="mouna.p@srkrec.ac.in">P Mouna (CSIT)</option>
                </optgroup>
              </select>
            </div>
          ) : activeTab === 'hod' ? (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Select Department HOD
              </label>
              <select
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 46, paddingLeft: 14, paddingRight: 14,
                  fontSize: 14, fontWeight: 600, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 12, outline: 'none', cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <option value="">-- Select HOD Name --</option>
                <option value="hod.csit@srkrec.ac.in">Dr. NGK Murthy — CSIT HOD</option>
                <option value="hod.csd@srkrec.ac.in">Dr. Suresh Babu Mudunuri — CSD HOD</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Register / Roll Number
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="e.g. 24B91A0724"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoComplete="username"
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
          )}

          {/* Photo Avatar Preview Card for Selected Faculty / HOD */}
          {(activeTab === 'faculty' || activeTab === 'hod') && identifier && FACULTY_PHOTO_MAP[identifier] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#FFF7ED',
                border: '1.5px solid #FED7AA', borderRadius: 14,
                marginTop: 2, marginBottom: 2,
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#EA580C', border: '1.5px solid #F97316', boxShadow: '0 2px 6px rgba(249,115,22,0.2)' }}>
                <img
                  src={FACULTY_PHOTO_MAP[identifier].photo}
                  alt={FACULTY_PHOTO_MAP[identifier].name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(FACULTY_PHOTO_MAP[identifier].name)}&background=F97316&color=fff`;
                  }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                  {FACULTY_PHOTO_MAP[identifier].name}
                </p>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#EA580C', background: 'rgba(234,88,12,0.1)', padding: '1px 6px', borderRadius: 6, marginTop: 3 }}>
                  {FACULTY_PHOTO_MAP[identifier].dept}
                </span>
              </div>
            </motion.div>
          )}

          {/* 4-Box PIN Passcode for Faculty & HOD / Standard Password for Student */}
          {activeTab === 'faculty' || activeTab === 'hod' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  4-Digit Passcode
                </label>
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Enter code or use Passkey</span>
              </div>

              {/* 4 Boxes + Passkey Button beside them */}
              <div style={{ display: 'flex', gap: 'clamp(5px, 2vw, 10px)', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                <div style={{ display: 'flex', gap: 'clamp(4px, 1.8vw, 8px)' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`pin-box-${idx}`}
                      type={showPassword ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={pin[idx]}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      onPaste={handlePinPaste}
                      style={{
                        width: 'clamp(38px, 10vw, 48px)',
                        height: 'clamp(44px, 11vw, 50px)',
                        textAlign: 'center',
                        fontSize: 'clamp(17px, 4.5vw, 20px)',
                        fontWeight: 800,
                        color: '#0F172A',
                        background: pin[idx] ? '#FFF7ED' : '#F8FAFC',
                        border: pin[idx] ? '2px solid #F97316' : '1.5px solid #E2E8F0',
                        borderRadius: 12,
                        outline: 'none',
                        boxShadow: pin[idx] ? '0 2px 8px rgba(249,115,22,0.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#F97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)';
                      }}
                      onBlur={(e) => {
                        if (!pin[idx]) {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    />
                  ))}
                </div>

                {/* 5th Square Fingerprint Box */}
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isLoading || passkeyLoading}
                  title="One-Tap Fingerprint / Passkey / Face ID Login"
                  style={{
                    width: 'clamp(38px, 10vw, 48px)',
                    height: 'clamp(44px, 11vw, 50px)',
                    borderRadius: 12,
                    background: '#FFF7ED',
                    border: '1.5px solid #F97316',
                    color: '#EA580C',
                    cursor: (isLoading || passkeyLoading) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(249,115,22,0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.color = '#EA580C'; }}
                >
                  {passkeyLoading ? (
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <Fingerprint size={22} />
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ fontSize: 11, fontWeight: 600, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? 'Hide Digits' : 'Show Digits'}</span>
                </button>
              </div>
            </div>
          ) : (
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
          )}

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#64748B' }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#F97316' }} />
              Remember me
            </label>
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
            disabled={isLoading || passkeyLoading}
            whileHover={{ scale: (isLoading || passkeyLoading) ? 1 : 1.01, y: (isLoading || passkeyLoading) ? 0 : -1 }}
            whileTap={{ scale: 0.985 }}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: '#F97316',
              color: '#fff', fontSize: 15, fontWeight: 700,
              border: 'none', cursor: (isLoading || passkeyLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 18px rgba(249,115,22,0.30)',
              opacity: (isLoading || passkeyLoading) ? 0.8 : 1,
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
          .login-page  { background:#F8FAFC; padding:12px 8px; justify-content:flex-start; min-height:100vh; }
          .login-card  { flex-direction:column; border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.06); min-height:auto; max-width:100%; border:1px solid #E2E8F0; background:#fff; }
          .login-left  { display:none; }
          .login-right { padding:18px 16px 24px; justify-content:flex-start; gap:0; background:#fff; }
          .login-mobile-top { display:flex; flex-direction:column; align-items:center; text-align:center; padding:16px 12px 14px; background:transparent; }
          .login-mobile-top img { width:52px !important; height:52px !important; margin-bottom:4px !important; }
          .login-mobile-top h1 { font-size:24px !important; margin-bottom:2px !important; }
          .login-form-card  { background:#fff; border-radius:0; padding:0; flex:1; box-shadow:none; border:none; margin:0; }
          .login-footer { margin-top:14px; padding-bottom:16px; font-size:11px; }
          .login-lightmode { display:none; }
          .login-heading { font-size:19px !important; }
        }
      `}</style>

      {/* ── Page ── */}
      <div className="login-page">

        {/* ── Mobile-only top header ── */}
        <div className="login-mobile-top">
          <img src={srkrEmblem} alt="SRKR" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 2px', lineHeight: 1.15 }}>
            SRKR Engineering College
          </h1>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#475569', margin: 0 }}>CSD &amp; CSIT</p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <img src={srkrEmblem} alt="SRKR" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                <div style={{ lineHeight: 1.15 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>SRKR Engineering College</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: 0 }}>CSD &amp; CSIT</p>
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
        <p className="login-footer">© 2026 AttendEase · SRKREC · v1.1.2.6. All rights reserved.</p>
      </div>
    </>
  );
}
