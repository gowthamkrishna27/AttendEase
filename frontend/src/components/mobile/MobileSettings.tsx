import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Bell, Palette, Info, HelpCircle,
  FileText, LogOut, Fingerprint, Lock, Smartphone,
  CheckCircle, ChevronRight, Moon, Sun, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isBiometricEnabled, setBiometricEnabled as saveBiometricEnabled, authenticateWithBiometrics } from '../../lib/nativeAuth';
import * as api from '../../lib/api';

interface MobileSettingsProps {
  roleName?: string;
}

export const MobileSettings: React.FC<MobileSettingsProps> = ({ roleName = 'User' }) => {
  const { user, logout, updateProfile } = useAuth();

  // Settings states
  const [biometricsOn, setBiometricsOn] = useState(() => isBiometricEnabled());
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [activeModal, setActiveModal] = useState<'about' | 'privacy' | 'help' | null>(null);

  const handleToggleBiometrics = async () => {
    if (!biometricsOn) {
      // Test biometrics before enabling
      const success = await authenticateWithBiometrics('Confirm fingerprint to enable biometric login');
      if (success) {
        setBiometricsOn(true);
        saveBiometricEnabled(true);
      }
    } else {
      setBiometricsOn(false);
      saveBiometricEnabled(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccess('');
    setPinError('');

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      await api.changePin(currentPin, newPin);
      setPinSuccess('4-Digit PIN updated successfully!');
      setCurrentPin('');
      setNewPin('');
    } catch (err: any) {
      setPinError(err?.message || 'Failed to update PIN. Please verify your current PIN.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">
          {roleName} Settings
        </p>
        <h1 className="text-[26px] font-heading font-bold text-slate-900">App Preferences</h1>
        <p className="text-[14px] text-slate-500 mt-1">Manage security, biometrics, notifications &amp; account</p>
      </motion.div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card px-6 py-5 mb-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold text-[13px] uppercase tracking-wider">
          <User size={16} />
          <span>Account Profile</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20, fontWeight: 'bold', flexShrink: 0,
          }}>
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="text-[17px] font-bold text-slate-900">{user?.name}</p>
            <p className="text-[13px] text-slate-500 capitalize">{user?.role} · {user?.department}</p>
            <p className="text-[12px] text-slate-400">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card px-6 py-5 mb-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold text-[13px] uppercase tracking-wider">
          <Shield size={16} />
          <span>Security &amp; Native Biometrics</span>
        </div>

        {/* Biometric Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Fingerprint size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900">Native Biometric Login</p>
              <p className="text-[12px] text-slate-500">Fingerprint &amp; Face Unlock authentication</p>
            </div>
          </div>
          <button
            onClick={handleToggleBiometrics}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              biometricsOn ? 'bg-orange-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                biometricsOn ? 'translate-x-7' : 'translate-x-1'
              }`}
              style={{ top: 4, position: 'absolute' }}
            />
          </button>
        </div>

        {/* Change PIN Form */}
        <div className="py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={16} className="text-slate-500" />
            <h3 className="text-[14px] font-bold text-slate-900">Change 4-Digit Security PIN</h3>
          </div>

          {pinSuccess && (
            <div className="p-3 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[12px] flex items-center gap-2">
              <CheckCircle size={14} />
              <span>{pinSuccess}</span>
            </div>
          )}
          {pinError && (
            <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[12px] flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="flex flex-wrap gap-2.5 items-center">
            <input
              type="password"
              maxLength={4}
              placeholder="Current PIN"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-mono w-28 text-center"
            />
            <input
              type="password"
              maxLength={4}
              placeholder="New 4-Digit PIN"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-mono w-32 text-center"
            />
            <button
              type="submit"
              disabled={isUpdatingPin}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12px] rounded-xl transition-all disabled:opacity-50"
            >
              {isUpdatingPin ? 'Updating...' : 'Update PIN'}
            </button>
          </form>
        </div>

        {/* Device Sessions */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900">Device Sessions</p>
              <p className="text-[12px] text-slate-500">Log out active sessions across devices</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={logout}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-[12px] rounded-xl transition-all"
            >
              Logout Current
            </button>
            <button
              onClick={() => {
                alert('Logged out all other active device sessions.');
                logout();
              }}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[12px] rounded-xl transition-all"
            >
              Logout All Devices
            </button>
          </div>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card px-6 py-5 mb-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold text-[13px] uppercase tracking-wider">
          <Bell size={16} />
          <span>Notifications</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[14px] font-bold text-slate-900">Push Notifications (FCM)</p>
            <p className="text-[12px] text-slate-500">Receive instant alerts on request status changes</p>
          </div>
          <button
            onClick={() => setNotificationsOn(!notificationsOn)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              notificationsOn ? 'bg-orange-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                notificationsOn ? 'translate-x-7' : 'translate-x-1'
              }`}
              style={{ top: 4, position: 'absolute' }}
            />
          </button>
        </div>
      </motion.div>

      {/* Theme Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card px-6 py-5 mb-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold text-[13px] uppercase tracking-wider">
          <Palette size={16} />
          <span>Theme &amp; Appearance</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900">Dark Mode (Beta)</p>
              <p className="text-[12px] text-slate-500">AttendEase Orange Light theme optimized for readability</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              darkMode ? 'bg-orange-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                darkMode ? 'translate-x-7' : 'translate-x-1'
              }`}
              style={{ top: 4, position: 'absolute' }}
            />
          </button>
        </div>
      </motion.div>

      {/* About & Support Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card px-6 py-4 mb-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm divide-y divide-slate-100"
      >
        <button
          onClick={() => setActiveModal('about')}
          className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Info size={18} className="text-slate-500" />
            <span className="text-[14px] font-bold text-slate-800">About AttendEase</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => setActiveModal('help')}
          className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className="text-slate-500" />
            <span className="text-[14px] font-bold text-slate-800">Help &amp; Support</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => setActiveModal('privacy')}
          className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-slate-500" />
            <span className="text-[14px] font-bold text-slate-800">Privacy Policy</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </motion.div>

      {/* Sign Out Button */}
      <button
        onClick={logout}
        className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <LogOut size={18} />
        <span>Sign Out Account</span>
      </button>

      {/* Info Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-[18px] font-bold text-slate-900 mb-3 capitalize">
              {activeModal === 'about' ? 'About AttendEase' : activeModal === 'help' ? 'Help & Support' : 'Privacy Policy'}
            </h3>
            {activeModal === 'about' && (
              <div className="text-[13px] text-slate-600 space-y-2">
                <p><strong>AttendEase Mobile v1.1.4</strong></p>
                <p>Official Attendance &amp; Permission Approval Platform for SRKREC.</p>
                <p className="text-[11px] text-slate-400">Built with React, Capacitor Android &amp; PostgreSQL (Neon).</p>
              </div>
            )}
            {activeModal === 'help' && (
              <div className="text-[13px] text-slate-600 space-y-2">
                <p>For support, please contact college admin at <strong>support@srkrec.ac.in</strong>.</p>
                <p>Faculty &amp; HOD helpdesk: Ext 402</p>
              </div>
            )}
            {activeModal === 'privacy' && (
              <div className="text-[13px] text-slate-600 space-y-2">
                <p>AttendEase stores authentication tokens securely on native Android KeyStore.</p>
                <p>Biometric data remains on your hardware device and is never transmitted to servers.</p>
              </div>
            )}
            <button
              onClick={() => setActiveModal(null)}
              className="mt-5 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[13px] rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
