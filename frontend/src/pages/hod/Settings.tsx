import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Shield, Eye, EyeOff, Globe, LogOut,
  Camera, Loader2, Check, Lock, Phone, Mail, User,
  Building, Briefcase, Trash2, KeyRound
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { FaceAlignedImage } from '../../components/shared/FaceAlignedImage';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

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
  { id: 'lang_english',  label: 'Language: English',      description: 'Portal language setting',                          icon: Globe,   defaultOn: true  },
];

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

  // Preferences toggles state
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map(t => [t.id, t.defaultOn]))
  );

  // Profile Save status
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Photo Upload status
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const handleToggle = (id: string) => {
    setStates(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!newPassword) {
      setPasswordMessage({ text: 'Please enter a new password.', type: 'error' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMessage({ text: 'New password must be at least 4 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.updateMe({
        currentPassword: currentPassword || undefined,
        password: newPassword,
      });
      setPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err: any) {
      setPasswordMessage({ text: err?.message || 'Failed to update password. Check current password.', type: 'error' });
    } finally {
      setIsChangingPassword(false);
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
          <p className="text-[14px] text-slate-500 mt-0.5">Manage your personal details, profile picture, security, and department preferences</p>
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
            <span className="text-[11px] font-bold px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full border border-orange-200">
              HOD Account
            </span>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Click to change photo"
              >
                <FaceAlignedImage
                  src={
                    user?.avatarUrl ||
                    (user?.department === 'CSIT'
                      ? 'https://www.srkrec.ac.in/assets/images/faculty/csit/781.jpeg'
                      : 'https://www.srkrec.ac.in/assets/images/faculty/csd/780.jpeg')
                  }
                  fallbackName={user?.name || 'HOD'}
                  alt={user?.name || 'HOD Profile'}
                  containerClassName="w-20 h-20 rounded-2xl border-2 border-orange-200 shadow-sm flex-shrink-0 bg-white"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                  <Camera size={20} />
                  <span className="text-[10px] font-bold mt-0.5">Change</span>
                </div>
                {isUploadingPhoto && (
                  <div className="absolute inset-0 rounded-2xl bg-orange-600/85 flex items-center justify-center text-white">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-[16px] font-bold text-slate-900">{user?.name || 'Department Head'}</p>
                <p className="text-[13px] text-slate-500 font-medium">
                  {designation || 'Head of Department'} · {user?.department || 'CSE / IT'}
                </p>
                <p className="text-[12px] text-slate-400 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-[12.5px] rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} />
                    <span>Upload Photo</span>
                  </>
                )}
              </button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={handleRemovePhoto}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-all cursor-pointer"
                  title="Remove custom photo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {photoMessage && (
            <div className={`p-3 mb-5 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 ${
              photoMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {photoMessage.type === 'success' ? <Check size={16} /> : null}
              <span>{photoMessage.text}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSaveProfile}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <User size={13} className="text-slate-400" />
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); setSaved(false); }}
                  placeholder="e.g. Dr. G. N. V. G. Sirisha"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" />
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setSaved(false); }}
                  placeholder="hod@srkrec.ac.in"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setSaved(false); }}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Briefcase size={13} className="text-slate-400" />
                  Designation / Title
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={e => { setDesignation(e.target.value); setSaved(false); }}
                  placeholder="Head of Department & Professor"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Building size={13} className="text-slate-400" />
                  Department (Assigned)
                </label>
                <input
                  type="text"
                  defaultValue={user?.department || 'Computer Science & Information Technology'}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Shield size={13} className="text-slate-400" />
                  User ID
                </label>
                <input
                  type="text"
                  defaultValue={user?.id || user?.userId || 'HOD'}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                />
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

        {/* ── 2. Password Change Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="card px-6 py-6 mb-6 bg-white border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-orange-500" />
                <span>Account Password</span>
              </h2>
              <p className="text-[12px] text-slate-400">Change your portal login password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 pr-10 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full px-3.5 py-2.5 pr-10 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all font-mono"
                />
              </div>
            </div>

            {passwordMessage && (
              <div className={`p-3 mb-4 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 ${
                passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {passwordMessage.type === 'success' ? <Check size={16} /> : null}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* ── 3. Security & Device Passkeys Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card px-6 py-6 mb-6 border border-orange-200/80 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Shield size={18} className="text-orange-600" />
                <h2 className="text-[15px] font-bold text-slate-900">Security &amp; Device Passkeys</h2>
              </div>
              <p className="text-[12px] text-slate-500">
                Manage registered biometric devices (Touch ID, Face ID, Windows Hello) and change your 4-digit approval PIN.
              </p>
            </div>
          </div>

          {/* Change PIN Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-4">
            <h3 className="text-[13px] font-bold text-slate-800 mb-2">Change 4-Digit Approval PIN Code</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="password"
                maxLength={4}
                placeholder="Current PIN"
                id="hod-current-pin"
                className="px-3 py-2 text-[13.5px] bg-white border border-slate-200 rounded-lg outline-none w-32 text-center font-mono"
              />
              <input
                type="password"
                maxLength={4}
                placeholder="New 4-Digit PIN"
                id="hod-new-pin"
                className="px-3 py-2 text-[13.5px] bg-white border border-slate-200 rounded-lg outline-none w-36 text-center font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  const currentPin = (document.getElementById('hod-current-pin') as HTMLInputElement)?.value;
                  const newPin = (document.getElementById('hod-new-pin') as HTMLInputElement)?.value;
                  if (!newPin || newPin.length !== 4) {
                    alert('Please enter a valid 4-digit numeric PIN');
                    return;
                  }
                  try {
                    await api.changePin(currentPin, newPin);
                    alert('✅ 4-Digit PIN updated in database successfully!');
                    (document.getElementById('hod-current-pin') as HTMLInputElement).value = '';
                    (document.getElementById('hod-new-pin') as HTMLInputElement).value = '';
                  } catch (err: any) {
                    alert(err?.message || 'Failed to update PIN');
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[12.5px] rounded-lg transition-colors cursor-pointer"
              >
                Update PIN
              </button>
            </div>
          </div>

          {/* Register Device Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3">
            <div>
              <p className="text-[13px] font-bold text-slate-800">Biometric Passkey / Device Pair</p>
              <p className="text-[11px] text-slate-400">Register Touch ID, Face ID, or Windows Hello on this device</p>
            </div>
            <button
              type="button"
              onClick={async () => {
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
                    alert('✅ Device Passkey registered in database successfully!');
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

        {/* ── 4. Preferences Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="card px-6 py-6 mb-6 bg-white border border-slate-200/80 shadow-sm"
        >
          <h2 className="text-[15px] font-bold text-slate-900 mb-4">Portal Preferences</h2>
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
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
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

        {/* ── 5. Account Session / Sign Out Card ── */}
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
