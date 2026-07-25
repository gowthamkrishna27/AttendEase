import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Eye, Moon, AlertTriangle, LogOut } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';

type Toggle = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultOn: boolean;
};

const TOGGLES: Toggle[] = [
  { id: 'email_notif',   label: 'Email Notifications',   description: 'Receive email alerts for new & updated requests', icon: Bell,   defaultOn: true  },
  { id: 'auto_flag',     label: 'Flag Suspicious Requests', description: 'Auto-flag duplicate or back-dated requests',     icon: Shield, defaultOn: false },
  { id: 'show_details',  label: 'Detailed Request View',  description: 'Show extended student info in request listings',  icon: Eye,    defaultOn: true  },
  { id: 'dark_mode',     label: 'Dark Mode',              description: 'Switch to dark theme (coming soon)',              icon: Moon,   defaultOn: false },
  { id: 'conflict_alert', label: 'Conflict Alerting',     description: 'Warn when a student has overlapping date requests', icon: AlertTriangle, defaultOn: true },
];

export default function FacultySettings() {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName]   = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map(t => [t.id, t.defaultOn]))
  );
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (id: string) => {
    setStates(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Faculty</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Settings</h1>
          <p className="text-[14px] text-slate-400 mt-1">Manage your profile and portal preferences</p>
        </motion.div>

        {/* ── Profile card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card px-6 py-5 mb-4"
        >
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20, fontStyle: 'bold', flexShrink: 0,
            }}>
              {user?.name?.charAt(0) ?? 'F'}
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-900">{user?.name}</p>
              <p className="text-[13px] text-slate-400">Faculty · {user?.department ?? 'Computer Science & Engineering'}</p>
              <p className="text-[12px] text-slate-300 mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Department</label>
              <input
                type="text"
                defaultValue={user?.department ?? 'Computer Science & Engineering'}
                readOnly
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Role</label>
              <input
                type="text"
                defaultValue="Faculty"
                readOnly
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Preferences card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card px-6 py-5 mb-4"
        >
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">Portal Preferences</h2>
          <div className="divide-y divide-slate-100">
            {TOGGLES.map(t => {
              const Icon = t.icon;
              const on   = states[t.id];
              return (
                <div key={t.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{t.label}</p>
                      <p className="text-[12px] text-slate-400">{t.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(t.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      on ? 'bg-orange-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                        on ? 'translate-x-6' : 'translate-x-1'
                      }`}
                      style={{ top: 4, position: 'absolute' }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Security & Passkey Management Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="card px-6 py-5 mb-4 border border-orange-200/80 bg-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Shield size={18} className="text-orange-600" />
                <h2 className="text-[15px] font-bold text-slate-900">Security &amp; Device Passkeys</h2>
              </div>
              <p className="text-[12px] text-slate-500">
                Manage registered devices (Touch ID, Face ID, Windows Hello) and change your 4-digit PIN.
              </p>
            </div>
          </div>

          {/* Change PIN Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-4">
            <h3 className="text-[13px] font-bold text-slate-800 mb-2">Change 4-Digit PIN Code</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="password"
                maxLength={4}
                placeholder="Current PIN"
                id="faculty-current-pin"
                className="px-3 py-1.5 text-[13px] bg-white border border-slate-200 rounded-lg outline-none w-28 text-center font-mono"
              />
              <input
                type="password"
                maxLength={4}
                placeholder="New 4-Digit PIN"
                id="faculty-new-pin"
                className="px-3 py-1.5 text-[13px] bg-white border border-slate-200 rounded-lg outline-none w-32 text-center font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  const currentPin = (document.getElementById('faculty-current-pin') as HTMLInputElement)?.value;
                  const newPin = (document.getElementById('faculty-new-pin') as HTMLInputElement)?.value;
                  if (!newPin || newPin.length !== 4) {
                    alert('Please enter a valid 4-digit numeric PIN');
                    return;
                  }
                  try {
                    await api.changePin(currentPin, newPin);
                    alert('✅ 4-Digit PIN updated in PostgreSQL successfully!');
                    (document.getElementById('faculty-current-pin') as HTMLInputElement).value = '';
                    (document.getElementById('faculty-new-pin') as HTMLInputElement).value = '';
                  } catch (err: any) {
                    alert(err?.message || 'Failed to update PIN');
                  }
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[12px] rounded-lg transition-colors cursor-pointer"
              >
                Update PIN
              </button>
            </div>
          </div>

          {/* Register Device Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-[13px] font-bold text-slate-800">Biometric Passkey / Device Pair</p>
              <p className="text-[11px] text-slate-400">Register Touch ID, Face ID, or Windows Hello on this device</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const userEmail = user?.email || '';
                  const challengeRes = await api.registerPasskeyChallenge(userEmail);
                  const challengeBytes = new Uint8Array(32);
                  window.crypto.getRandomValues(challengeBytes);
                  const userIdBytes = new TextEncoder().encode(userEmail);

                  const cred = (await navigator.credentials.create({
                    publicKey: {
                      challenge: challengeBytes,
                      rp: challengeRes.rp || { name: 'SRKR AttendEase', id: window.location.hostname },
                      user: {
                        id: userIdBytes,
                        name: userEmail,
                        displayName: user?.name || userEmail.split('@')[0],
                      },
                      pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' },
                      ],
                      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'preferred' },
                      timeout: 60000,
                    },
                  })) as PublicKeyCredential | null;

                  if (cred?.id) {
                    const deviceName = `${navigator.platform || 'Device'} — ${new Date().toLocaleDateString()}`;
                    await api.registerPasskey(cred.id, cred.id, deviceName, userEmail);
                    localStorage.setItem(`attendease_device_passkey_${userEmail}`, 'true');
                    alert('✅ Device Passkey registered in PostgreSQL successfully!');
                  }
                } catch (err: any) {
                  if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
                    alert(err?.message || 'Passkey registration cancelled / failed.');
                  }
                }
              }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[12px] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>👆 Add / Register Device</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[14px] font-bold rounded-xl shadow-subtle transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : saved ? 'Saved to SQL!' : 'Save Preferences'}
            </button>
            {saved && (
              <span className="text-[13px] text-emerald-600 font-semibold animate-fade-in">
                ✓ Profile saved to database successfully
              </span>
            )}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-rose-500 border border-rose-200 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
