import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Eye, Moon, Globe } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';

type Toggle = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultOn: boolean;
};

const TOGGLES: Toggle[] = [
  { id: 'email_notif',   label: 'Email Notifications',    description: 'Receive email alerts for new & updated requests', icon: Bell,    defaultOn: true  },
  { id: 'auto_approve',  label: 'Auto-approve Faculty',   description: 'Automatically approve faculty-recommended requests', icon: Shield,  defaultOn: false },
  { id: 'show_details',  label: 'Detailed Request View',  description: 'Show extended student info in request listings',   icon: Eye,     defaultOn: true  },
  { id: 'dark_mode',     label: 'Dark Mode',              description: 'Switch to dark theme (coming soon)',               icon: Moon,    defaultOn: false },
  { id: 'lang_english',  label: 'Language: English',      description: 'Portal language setting',                          icon: Globe,   defaultOn: true  },
];

export default function HODSettings() {
  const { user } = useAuth();
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map(t => [t.id, t.defaultOn]))
  );
  const [saved, setSaved] = useState(false);

  const handleToggle = (id: string) => {
    setStates(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageWrapper role="hod">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">HOD</p>
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
              color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.name?.charAt(0) ?? 'H'}
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-900">{user?.name}</p>
              <p className="text-[13px] text-slate-400">Head of Department · Computer Science &amp; Engineering</p>
              <p className="text-[12px] text-slate-300 mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Department</label>
              <input
                type="text"
                defaultValue="Computer Science & Engineering"
                readOnly
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Role</label>
              <input
                type="text"
                defaultValue="HOD"
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
          className="card px-6 py-5 mb-6"
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

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[14px] font-bold rounded-xl shadow-subtle transition-all"
          >
            {saved ? 'Saved!' : 'Save Preferences'}
          </button>
          {saved && (
            <span className="text-[13px] text-emerald-600 font-semibold animate-fade-in">
              ✓ Settings updated successfully
            </span>
          )}
        </div>

      </div>
    </PageWrapper>
  );
}
