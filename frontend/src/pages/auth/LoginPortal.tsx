import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, ShieldCheck,
  Eye, EyeOff, Fingerprint, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import { RegisterPasskeyModal } from '../../components/auth/RegisterPasskeyModal';
import * as api from '../../lib/api';

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
  const location = useLocation();
  const { setUser } = useAuth();

  const fromPath = location.state?.from?.pathname || (typeof location.state?.from === 'string' ? location.state.from : null);
  // Also support ?redirect= query param (used by share links)
  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const getPostLoginTarget = (role: UserRole) => {
    if (redirectParam) return redirectParam;
    if (fromPath) return fromPath;
    return role === 'student' ? '/student' : role === 'faculty' ? '/faculty' : '/hod';
  };

  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [dynamicFaculty, setDynamicFaculty] = useState<api.PublicFacultyMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getPublicFacultyList().then(list => {
      if (isMounted && list && list.length > 0) {
        setDynamicFaculty(list);
      }
    }).catch(err => {
      console.warn('Could not fetch dynamic faculty list:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // Group dynamic faculty members by department
  const facultyListOptions = useMemo(() => {
    const dbFaculty = dynamicFaculty.filter(f => f.role === 'faculty');
    if (dbFaculty.length > 0) {
      const csd = dbFaculty.filter(f => (f.department || '').toUpperCase().includes('CSD'));
      const csit = dbFaculty.filter(f => (f.department || '').toUpperCase().includes('CSIT'));
      const others = dbFaculty.filter(f => !(f.department || '').toUpperCase().includes('CSD') && !(f.department || '').toUpperCase().includes('CSIT'));
      return { csd, csit, others, isDynamic: true };
    }
    return { csd: [], csit: [], others: [], isDynamic: false };
  }, [dynamicFaculty]);

  const hodListOptions = useMemo(() => {
    return dynamicFaculty.filter(f => f.role === 'hod');
  }, [dynamicFaculty]);

  // Selected faculty or HOD profile preview card
  const selectedFacultyProfile = useMemo(() => {
    if (!identifier) return null;
    const match = dynamicFaculty.find(f => f.email.toLowerCase() === identifier.toLowerCase() || f.userId === identifier);
    if (match) {
      return {
        name: match.name,
        dept: match.department ? `${match.department} ${match.role === 'hod' ? 'HOD' : 'Faculty'}` : (match.role === 'hod' ? 'HOD' : 'Faculty'),
        photo: match.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.name)}&background=F97316&color=fff`,
      };
    }
    return FACULTY_PHOTO_MAP[identifier] || null;
  }, [identifier, dynamicFaculty]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIdentifier('');
    setPassword('');
    setPin(['', '', '', '']);
    setError('');
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

    if (newPin.every(d => d !== '') && newPin.join('').length === 4) {
      setTimeout(() => {
        document.getElementById('login-submit-btn')?.click();
      }, 60);
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
  const [showRegisterPasskeyModal, setShowRegisterPasskeyModal] = useState(false);
  const [pendingLoginUser, setPendingLoginUser] = useState<{ email: string; name: string; role: UserRole } | null>(null);

  const handlePasskeyLogin = async () => {
    setError('');
    const targetIdentifier = identifier.trim();

    if (!targetIdentifier) {
      if (activeTab === 'faculty') {
        setError('Please select your Faculty name from the dropdown before using Passkey / Fingerprint.');
      } else if (activeTab === 'hod') {
        setError('Please select your HOD name from the dropdown before using Passkey / Fingerprint.');
      } else {
        setError('Please enter your Registered Number before using Passkey / Fingerprint.');
      }
      return;
    }

    setPasskeyLoading(true);

    try {
      if (!window.PublicKeyCredential || typeof navigator.credentials?.get !== 'function') {
        throw new Error('Passkey authentication is not supported on this browser/device.');
      }

      // 1. Fetch challenge & allowed credential IDs from PostgreSQL for this user
      const challengeRes = await api.loginPasskeyChallenge(targetIdentifier);

      if (!challengeRes.hasPasskey || !challengeRes.allowCredentials || challengeRes.allowCredentials.length === 0) {
        setError('No passkey registered for this account on this device yet. Please enter your PIN / Password to log in first.');
        setPasskeyLoading(false);
        return;
      }

      // 2. Convert base64url challenge bytes
      const challengeBytes = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBytes);

      // Convert stored credential IDs
      const allowCredentials = challengeRes.allowCredentials.map((c: any) => {
        try {
          const raw = atob(c.id.replace(/-/g, '+').replace(/_/g, '/'));
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          return { id: arr, type: 'public-key' as const };
        } catch {
          return { id: new TextEncoder().encode(c.id), type: 'public-key' as const };
        }
      });

      // 3. Trigger native WebAuthn get prompt with explicit allowCredentials filter
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes,
          rpId: window.location.hostname,
          allowCredentials,
          timeout: 30000,
          userVerification: 'preferred',
        },
      })) as PublicKeyCredential | null;

      // 4. Send verified assertion to backend to authenticate against PostgreSQL UserPasskey records
      const { token, user: u } = await api.verifyPasskeyLogin(targetIdentifier, credential?.id);
      api.setStoredToken(token, rememberMe);
      setUser(u);
      setError('');

      navigate(getPostLoginTarget(activeTab), { replace: true });
    } catch (err: unknown) {
      console.warn('Passkey login error:', err);
      const msg = err instanceof Error ? err.message : 'Passkey authentication failed.';
      if (msg.includes('cancel') || (err as any)?.name === 'AbortError') {
        setError('Passkey authentication was cancelled by user.');
      } else {
        setError('No passkey registered for this account on this device yet. Please enter your PIN / Password to log in.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError(activeTab === 'faculty' ? 'Please select a Faculty member from the dropdown.' : activeTab === 'hod' ? 'Please select an HOD from the dropdown.' : 'Please enter your Registered Number.');
      return;
    }

    const enteredPin = pin.join('');
    if (activeTab === 'faculty' || activeTab === 'hod') {
      if (enteredPin.length === 0 && !password) {
        setError('Please enter your 4-digit PIN code or tap the Fingerprint icon.');
        return;
      }
      if (enteredPin.length > 0 && enteredPin.length < 4) {
        setError('Please enter all 4 digits of your PIN code.');
        return;
      }
    }

    const currentPass = (activeTab === 'faculty' || activeTab === 'hod')
      ? (enteredPin.length === 4 ? enteredPin : password)
      : password;

    setIsLoading(true);
    try {
      const role: UserRole = activeTab;

      // Strict backend authentication against PostgreSQL user.password
      const res = await api.login(identifier.trim(), currentPass, role);
      api.setStoredToken(res.token, rememberMe);
      setUser(res.user);

      const devicePasskeyRegistered = localStorage.getItem(`attendease_device_passkey_${res.user.email}`);

      // If user logged in via PIN and has no registered device passkey, prompt to register device passkey
      if ((role === 'faculty' || role === 'hod') && !res.hasPasskey && !devicePasskeyRegistered && window.PublicKeyCredential) {
        setPendingLoginUser({ email: res.user.email, name: res.user.name, role });
        setShowRegisterPasskeyModal(true);
      } else {
        navigate(getPostLoginTarget(role), { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 selection:bg-orange-100 selection:text-orange-900 box-border">
      {/* Top Centered Brand Logo & Heading (Tailwind Animations) */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col items-center text-center mb-4 sm:mb-5"
      >
        <img
          src={logo}
          alt="AttendEase Logo"
          className="w-12 h-12 object-contain mb-2.5 transition-transform duration-300 hover:scale-105"
        />
        <h1 className="text-[17.5px] font-medium text-slate-700 tracking-tight select-none">
          Login to <span className="font-bold text-slate-900">Attend</span><span className="font-black text-orange-500">Ease</span>
        </h1>
      </motion.div>

      {/* Centered Clean Card (Semi-curved aesthetic) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-[380px] bg-white rounded-xl p-5 sm:p-6 shadow-[0_3px_16px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.03)] border border-slate-200/90 flex flex-col transition-all duration-300 hover:shadow-[0_6px_24px_-2px_rgba(249,115,22,0.09)] box-border"
      >
        {/* Role selection tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-1 mb-4 border border-slate-200/50">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-1 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer select-none active:scale-95 ${isActive
                  ? 'bg-white text-orange-600 shadow-xs border border-slate-200/60 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Icon size={12.5} className={isActive ? 'text-orange-500' : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form with Staggered Component Transitions */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Identifier input */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.12 }}
            >
              {activeTab === 'faculty' ? (
                <div>
                  <select
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full h-[42px] px-3.5 text-[13px] font-medium text-slate-900 bg-slate-100 border border-slate-200/80 rounded-lg outline-none cursor-pointer transition-all duration-150 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                  >
                    <option value="">Select Faculty Member (CSD &amp; CSIT)</option>
                    {facultyListOptions.isDynamic ? (
                      <>
                        {facultyListOptions.csd.length > 0 && (
                          <optgroup label="CSD Department Faculty">
                            {facultyListOptions.csd.map(f => (
                              <option key={f.userId || f.email} value={f.email}>{f.name} ({f.department || 'CSD'})</option>
                            ))}
                          </optgroup>
                        )}
                        {facultyListOptions.csit.length > 0 && (
                          <optgroup label="CSIT Department Faculty">
                            {facultyListOptions.csit.map(f => (
                              <option key={f.userId || f.email} value={f.email}>{f.name} ({f.department || 'CSIT'})</option>
                            ))}
                          </optgroup>
                        )}
                        {facultyListOptions.others.length > 0 && (
                          <optgroup label="Other Faculty">
                            {facultyListOptions.others.map(f => (
                              <option key={f.userId || f.email} value={f.email}>{f.name} ({f.department || 'Faculty'})</option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </select>
                </div>
              ) : activeTab === 'hod' ? (
                <div>
                  <select
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full h-[42px] px-3.5 text-[13px] font-medium text-slate-900 bg-slate-100 border border-slate-200/80 rounded-lg outline-none cursor-pointer transition-all duration-150 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                  >
                    <option value="">Select Department HOD</option>
                    {hodListOptions.length > 0 ? (
                      hodListOptions.map(h => (
                        <option key={h.userId || h.email} value={h.email}>
                          {h.name} — {h.department || 'HOD'}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="hod.csit@srkrec.ac.in">Dr. NGK Murthy — CSIT HOD</option>
                        <option value="hod.csd@srkrec.ac.in">Dr. Suresh Babu Mudunuri — CSD HOD</option>
                      </>
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="24B91A0724"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value.toUpperCase())}
                    autoComplete="username"
                    className="w-full h-[42px] px-3.5 text-[13.5px] text-slate-900 bg-slate-100 border border-slate-200/80 rounded-lg outline-none transition-all duration-150 uppercase placeholder:normal-case placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 font-medium tracking-wide"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Selected Faculty/HOD Badge preview */}
          {(activeTab === 'faculty' || activeTab === 'hod') && identifier && selectedFacultyProfile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2.5 p-2 bg-orange-50/60 border border-orange-200/80 rounded-lg"
            >
              <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-orange-500 shadow-xs">
                <img
                  src={selectedFacultyProfile.photo}
                  alt={selectedFacultyProfile.name}
                  className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFacultyProfile.name)}&background=F97316&color=fff`;
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate m-0 leading-tight">
                  {selectedFacultyProfile.name}
                </p>
                <span className="text-[10px] font-semibold text-orange-600">
                  {selectedFacultyProfile.dept}
                </span>
              </div>
            </motion.div>
          )}

          {/* Password / 4-digit PIN Passcode (Semi-curved Boxes) */}
          {activeTab === 'faculty' || activeTab === 'hod' ? (
            <div>
              <div className="flex gap-1.5 sm:gap-2 items-center justify-center my-0.5">
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
                    placeholder="•"
                    className={`w-[clamp(34px,10vw,42px)] h-[clamp(36px,10vw,42px)] text-center text-[17px] font-black rounded-lg outline-none transition-all duration-150 active:scale-95 focus:scale-105 ${pin[idx]
                      ? 'text-orange-600 bg-orange-50/70 border-2 border-orange-500 shadow-xs shadow-orange-500/20'
                      : 'text-slate-900 bg-slate-100 border border-slate-200/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15'
                      }`}
                  />
                ))}

                {/* Eye Show/Hide PIN Box Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? 'Hide PIN' : 'Show PIN'}
                  aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
                  className={`w-[clamp(34px,10vw,42px)] h-[clamp(36px,10vw,42px)] rounded-lg border flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90 cursor-pointer shadow-xs ${showPassword
                    ? 'bg-orange-50 border-orange-300 text-orange-600'
                    : 'bg-slate-100 border-slate-200/80 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
                    }`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                {/* Fingerprint / Passkey quick button */}
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isLoading || passkeyLoading}
                  title="Fingerprint / Passkey Login"
                  className="w-[clamp(34px,10vw,42px)] h-[clamp(36px,10vw,42px)] rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 transition-all duration-150 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:scale-105 active:scale-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  {passkeyLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent inline-block animate-spin" />
                  ) : (
                    <Fingerprint size={18} className="transition-transform duration-150 hover:rotate-6" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="•••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-[42px] px-3.5 pr-11 text-[13.5px] text-slate-900 bg-slate-100 border border-slate-200/80 rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-all duration-150 cursor-pointer p-1 rounded-md hover:bg-slate-200/60 active:scale-90 flex items-center justify-center"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message with Shake/Fade Animation */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          {/* Primary Login Button (Semi-curved) */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading || passkeyLoading}
            className="w-full h-[42px] rounded-lg bg-orange-500 text-white text-sm font-semibold border-none cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all duration-150 hover:bg-orange-600 hover:shadow-sm hover:scale-[1.005] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-0.5"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white inline-block animate-spin" />
            ) : (
              <span>Login</span>
            )}
          </button>

          {/* "or" Divider */}
          <div className="text-center text-[11.5px] font-medium text-slate-400 my-0.5">
            or
          </div>

          {/* View Approved Permissions Button (Semi-curved) */}
          <button
            type="button"
            onClick={() => navigate('/permissions')}
            className="w-full h-[42px] rounded-lg bg-orange-50/80 hover:bg-orange-100/90 text-orange-700 text-[13px] font-semibold border border-orange-200/80 cursor-pointer flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.005] active:scale-[0.98] shadow-2xs"
          >
            <Shield size={14} className="text-orange-600" />
            <span>View Approved Permissions</span>
          </button>

          {/* Bottom Forgot PIN / Password link */}
          <div className="text-center mt-1">
            {activeTab === 'faculty' || activeTab === 'hod' ? (
              <button
                type="button"
                onClick={() => alert('Please contact the college administration to reset your PIN.')}
                className="text-[12px] font-medium text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
              >
                Forgot PIN?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => alert('Please contact the administration office or your counselor to reset your password.')}
                className="text-[12px] font-medium text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            )}
          </div>

          <div className="text-center mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </motion.div>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-5 text-center transition-colors">
        © 2026 Attend<span className="text-orange-600 font-semibold">Ease</span> · SRKREC. All rights reserved.
      </p>

      {/* Post-PIN Login Passkey Registration Modal */}
      <RegisterPasskeyModal
        isOpen={showRegisterPasskeyModal}
        onClose={() => {
          setShowRegisterPasskeyModal(false);
          if (pendingLoginUser) {
            const r = pendingLoginUser.role;
            navigate(getPostLoginTarget(r), { replace: true });
          }
        }}
        userEmail={pendingLoginUser?.email || ''}
        userName={pendingLoginUser?.name || ''}
        onSuccess={() => {
          setShowRegisterPasskeyModal(false);
          if (pendingLoginUser) {
            const r = pendingLoginUser.role;
            navigate(getPostLoginTarget(r), { replace: true });
          }
        }}
      />
    </div>
  );
}
