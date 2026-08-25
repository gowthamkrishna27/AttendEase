import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  Camera, Loader2, Check, Phone, Mail, User,
  Building, Briefcase, Trash2, Fingerprint, KeyRound, ShieldCheck,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { FaceAlignedImage } from '../../components/shared/FaceAlignedImage';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

export default function HODSettings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [designation, setDesignation] = useState(user?.designation ?? 'Head of Department & Professor');

  // Profile Save status
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Photo Upload status
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 4-Digit Approval PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Biometric Passkey state
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoMessage({ text: 'Please select a valid image file (PNG, JPG, JPEG, WEBP).', type: 'error' });
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const { url } = await api.uploadProofDocument(file);
      if (url) {
        await updateProfile({ avatarUrl: url });
        void queryClient.invalidateQueries({ queryKey: ['hod'] });
        void queryClient.invalidateQueries({ queryKey: ['faculty'] });
        void queryClient.invalidateQueries({ queryKey: ['requests'] });
        setPhotoMessage({ text: 'Profile photo updated and saved successfully!', type: 'success' });
        setTimeout(() => setPhotoMessage(null), 4000);
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setPhotoMessage({ text: err?.message || 'Failed to upload photo. Please try again.', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your custom profile photo?')) return;
    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      await updateProfile({ avatarUrl: '' });
      void queryClient.invalidateQueries({ queryKey: ['hod'] });
      void queryClient.invalidateQueries({ queryKey: ['faculty'] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      setPhotoMessage({ text: 'Profile photo removed.', type: 'success' });
      setTimeout(() => setPhotoMessage(null), 3000);
    } catch (err: any) {
      setPhotoMessage({ text: err?.message || 'Failed to remove photo.', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Full name cannot be empty');
      return;
    }
    if (!email.trim()) {
      setProfileError('Email address cannot be empty');
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
      });
      void queryClient.invalidateQueries({ queryKey: ['hod'] });
      void queryClient.invalidateQueries({ queryKey: ['faculty'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMessage({ text: 'New PIN must be exactly 4 numeric digits (0-9).', type: 'error' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ text: 'New PIN and confirmation PIN do not match.', type: 'error' });
      return;
    }

    setIsUpdatingPin(true);
    try {
      await api.changePin(currentPin, newPin);
      setPinMessage({ text: '4-Digit Approval PIN updated and saved successfully!', type: 'success' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => setPinMessage(null), 4000);
    } catch (err: any) {
      setPinMessage({ text: err?.message || 'Failed to update PIN. Please verify your current PIN.', type: 'error' });
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    setPasskeyMessage(null);

    try {
      const userEmail = user?.email || '';
      await api.registerPasskeyChallenge(userEmail);
      const challengeBytes = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBytes);
      const userIdBytes = new TextEncoder().encode(userEmail);

      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: { name: 'SRKR AttendEase', id: window.location.hostname },
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
        setPasskeyMessage({ text: 'Biometric passkey registered successfully for this device!', type: 'success' });
        setTimeout(() => setPasskeyMessage(null), 4000);
      }
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        setPasskeyMessage({ text: err?.message || 'Passkey registration cancelled or not supported.', type: 'error' });
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <PageWrapper role="hod" showGreeting={false}>
      <div className="max-w-3xl mx-auto pb-12">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-600 uppercase tracking-wider mb-1">Department Head</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Profile &amp; Settings</h1>
          <p className="text-[14px] text-slate-500 mt-0.5">Manage your personal profile, 4-digit approval PIN, and biometric security</p>
        </motion.div>

        {/* ── 1. Profile & Avatar Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card px-6 py-6 mb-6 bg-white border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-orange-500" />
                <span>Personal Information</span>
              </h2>
              <p className="text-[12px] text-slate-400">Update your photo, contact info, and department title</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-7 mb-7 pb-7 border-b border-slate-100">
            {/* Enlarged Photo Container */}
            <div className="relative group shrink-0">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-md flex items-center justify-center relative ring-4 ring-slate-50">
                {user?.avatarUrl ? (
                  <FaceAlignedImage
                    src={user.avatarUrl}
                    alt={user?.name || 'HOD Photo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-heading font-bold text-slate-400">
                    {(user?.name || 'H').charAt(0).toUpperCase()}
                  </span>
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 size={28} className="animate-spin" />
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                title="Upload custom profile photo"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <h3 className="text-[20px] font-heading font-bold text-slate-900 truncate">
                  {user?.name || 'Department Head'}
                </h3>
              </div>
              <p className="text-[14px] text-slate-600 font-medium mb-3">
                {user?.designation || 'Head of Department & Professor'}
              </p>
              
              <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start flex-wrap">
                <span className="text-[11.5px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full inline-block">
                  {user?.department || 'CSD & CSIT'}
                </span>
                <span className="text-[11.5px] text-slate-400">SRKR Engineering College</span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-700 border border-orange-200 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Camera size={14} />
                  <span>Change Profile Photo</span>
                </button>
                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 bg-white hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {photoMessage && (
            <div className={`p-3 mb-4 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 ${
              photoMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {photoMessage.type === 'success' ? <Check size={16} /> : null}
              <span>{photoMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full pl-9 pr-3.5 py-2 text-[13.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-9 pr-3.5 py-2 text-[13.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2 text-[13.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Designation / Role Title
                </label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="Head of Department"
                    className="w-full pl-9 pr-3.5 py-2 text-[13.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <Building size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    disabled
                    value={user?.department || 'Computer Science & Design (CSD)'}
                    className="w-full pl-9 pr-3.5 py-2 text-[13.5px] bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {profileError && (
              <p className="text-[13px] text-rose-600 font-medium mb-4">{profileError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[13.5px] font-bold rounded-xl shadow-subtle transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
              {saved && (
                <span className="text-[13px] text-emerald-600 font-semibold animate-fade-in flex items-center gap-1">
                  <Check size={15} />
                  <span>Profile updated successfully!</span>
                </span>
              )}
            </div>
          </form>
        </motion.div>

        {/* ── 2. Security & Fast Approvals Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card px-6 py-6 mb-6 border border-slate-200/90 bg-white shadow-sm space-y-6"
        >
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-orange-500" />
              <h2 className="text-[16px] font-bold text-slate-900">Security &amp; Device Passkeys</h2>
            </div>
            <p className="text-[12.5px] text-slate-400 mt-0.5">
              Set approval PIN and pair biometric security
            </p>
          </div>

          {/* 4-Digit Approval PIN Code */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={16} className="text-slate-700" />
              <h3 className="text-[14px] font-bold text-slate-900">4-Digit Approval PIN</h3>
            </div>

            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={currentPin}
                    onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-center font-mono font-bold tracking-widest text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 text-center">Default: 1234</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    New PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-center font-mono font-bold tracking-widest text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 text-center">4 digits</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Confirm PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-center font-mono font-bold tracking-widest text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 text-center">Repeat 4 digits</span>
                </div>
              </div>

              {pinMessage && (
                <div className={`p-3 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 ${
                  pinMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {pinMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{pinMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPin || !newPin || newPin.length !== 4}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-[12.5px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-2xs"
              >
                {isUpdatingPin ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>{isUpdatingPin ? 'Updating PIN...' : 'Save PIN'}</span>
              </button>
            </form>
          </div>

          {/* Biometric Passkey / Device Pair */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Fingerprint size={20} />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-slate-900">Biometric Passkey</h4>
                <p className="text-[12px] text-slate-500">
                  Touch ID, Face ID, or Windows Hello for instant approvals
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isRegisteringPasskey}
              onClick={handleRegisterPasskey}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-[12.5px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-50"
            >
              {isRegisteringPasskey ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Fingerprint size={15} />
                  <span>Pair Device</span>
                </>
              )}
            </button>
          </div>

          {passkeyMessage && (
            <div className={`p-3 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 ${
              passkeyMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {passkeyMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passkeyMessage.text}</span>
            </div>
          )}
        </motion.div>

        {/* ── 3. Account Session / Sign Out Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card px-6 py-5 mb-6 bg-white border border-slate-200/80 shadow-sm flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h2 className="text-[14px] font-bold text-slate-900">Account Session</h2>
            <p className="text-[12px] text-slate-400">Log out of your AttendEase HOD session on this device</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[13px] rounded-xl border border-rose-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
