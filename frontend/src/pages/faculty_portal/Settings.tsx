import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Eye, AlertTriangle, LogOut, Camera, Loader2, Check, Download } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { FaceAlignedImage } from '../../components/shared/FaceAlignedImage';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { CURRENT_APP_VERSION, LATEST_RELEASE_PAGE, checkAppUpdate } from '../../lib/appUpdate';

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
  { id: 'conflict_alert', label: 'Conflict Alerting',     description: 'Warn when a student has overlapping date requests', icon: AlertTriangle, defaultOn: true },
];

export default function FacultySettings() {
  const { user, logout, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]   = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map(t => [t.id, t.defaultOn]))
  );
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const { url } = await api.uploadProofDocument(file);
      if (url) {
        await updateProfile({ avatarUrl: url });
        void queryClient.invalidateQueries({ queryKey: ['faculty'] });
        void queryClient.invalidateQueries({ queryKey: ['requests'] });
        setPhotoMessage('Photo uploaded to Cloudinary and updated everywhere!');
        setTimeout(() => setPhotoMessage(null), 4000);
      } else {
        throw new Error('Failed to upload photo to Cloudinary');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setPhotoMessage(err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Click to change photo"
              >
                <FaceAlignedImage
                  src={user?.avatarUrl}
                  fallbackName={user?.name || 'Faculty'}
                  alt={user?.name || 'Faculty'}
                  containerClassName="w-16 h-16 rounded-2xl border-2 border-orange-200 shadow-sm flex-shrink-0"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                  <Camera size={18} />
                  <span className="text-[9px] font-bold mt-0.5">Change</span>
                </div>
                {isUploadingPhoto && (
                  <div className="absolute inset-0 rounded-2xl bg-orange-600/80 flex items-center justify-center text-white">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-[16px] font-bold text-slate-900">{user?.name}</p>
                <p className="text-[13px] text-slate-400">Faculty · {user?.department ?? 'Computer Science & Engineering'}</p>
                <p className="text-[12px] text-slate-300 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-600 font-bold text-[12.5px] rounded-xl border border-orange-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading to Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} />
                    <span>Change Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {photoMessage && (
            <div className={`mb-4 px-3.5 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${
              photoMessage.includes('Cloudinary') 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {photoMessage.includes('Cloudinary') ? <Check size={14} /> : <AlertTriangle size={14} />}
              <span>{photoMessage}</span>
            </div>
          )}
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

        {/* ── Security Management Card ── */}
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
                <h2 className="text-[15px] font-bold text-slate-900">Security &amp; PIN Settings</h2>
              </div>
              <p className="text-[12px] text-slate-500">
                Change your 4-digit faculty login PIN code securely.
              </p>
            </div>
          </div>

          {/* Change PIN Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
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
        </motion.div>

        {/* ── In-App Updates & Version Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="card px-6 py-5 mb-4 border border-slate-200/80 bg-white"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <a
                href={LATEST_RELEASE_PAGE}
                target="_blank"
                rel="noreferrer"
                title="View Latest Release on GitHub"
                className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0 hover:bg-orange-100 transition-colors"
              >
                <Download size={20} />
              </a>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-slate-900">App Updates &amp; Version</h2>
                  <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-md">
                    {CURRENT_APP_VERSION}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500">
                  AttendEase Android App · Follows GitHub release tag
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isCheckingUpdate}
                onClick={async () => {
                  setIsCheckingUpdate(true);
                  setUpdateMessage(null);
                  try {
                    const info = await checkAppUpdate();
                    if (info.hasUpdate) {
                      setUpdateMessage(`🎉 New version ${info.latestVersion} available!`);
                    } else {
                      setUpdateMessage(`✅ You're on the latest release (${info.latestVersion})`);
                    }
                  } catch {
                    setUpdateMessage(`✅ Running latest release (${CURRENT_APP_VERSION})`);
                  } finally {
                    setIsCheckingUpdate(false);
                    setTimeout(() => setUpdateMessage(null), 5000);
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 hover:border-orange-200 border border-slate-200 rounded-xl font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60 shadow-2xs active:scale-95"
              >
                {isCheckingUpdate ? (
                  <Loader2 size={15} className="animate-spin text-orange-600" />
                ) : (
                  <Download size={15} className="text-orange-600" />
                )}
                <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>

              <a
                href={LATEST_RELEASE_PAGE}
                target="_blank"
                rel="noreferrer"
                title="Download Latest APK from GitHub Releases"
                className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                <Download size={16} />
              </a>
            </div>
          </div>

          {updateMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-600 shrink-0" />
                <span>{updateMessage}</span>
              </div>
              <a
                href={LATEST_RELEASE_PAGE}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-orange-600 underline hover:text-orange-700"
              >
                Open Releases &rarr;
              </a>
            </motion.div>
          )}
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
