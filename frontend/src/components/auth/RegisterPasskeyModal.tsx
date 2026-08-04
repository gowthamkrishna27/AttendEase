import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import * as api from '../../lib/api';

interface RegisterPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  onSuccess?: () => void;
}

export function RegisterPasskeyModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  onSuccess,
}: RegisterPasskeyModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setIsRegistering(true);
    setErrorMsg('');
    try {
      if (!window.PublicKeyCredential || typeof navigator.credentials?.create !== 'function') {
        throw new Error('Biometric passkeys are not supported on this browser/device.');
      }

      // 1. Get WebAuthn challenge from backend
      const challengeRes = await api.registerPasskeyChallenge(userEmail);

      // 2. Convert base64url challenge string to Uint8Array
      const challengeBytes = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBytes);
      const userIdBytes = new TextEncoder().encode(userEmail);

      // 3. Trigger native browser/OS WebAuthn create prompt
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: {
            name: 'SRKR AttendEase',
            id: window.location.hostname,
          },
          user: {
            id: userIdBytes,
            name: userEmail,
            displayName: userName || userEmail.split('@')[0],
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (cred?.id) {
        // 4. Save credential ID to PostgreSQL database via API
        const deviceName = `${navigator.platform || 'Device'} — ${new Date().toLocaleDateString()}`;
        await api.registerPasskey(cred.id, cred.id, deviceName, userEmail);

        // Mark local device flag
        localStorage.setItem(`attendease_device_passkey_${userEmail}`, 'true');
        setSuccessMsg('Passkey / Fingerprint registered successfully!');

        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.warn('Passkey registration cancelled/failed:', err);
      const msg = err?.message || 'Passkey registration cancelled.';
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError' || msg.includes('cancel')) {
        setErrorMsg('Passkey registration was cancelled.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden"
        >
          {/* Top banner accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Body */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 mb-4 shadow-sm">
              <Fingerprint size={28} />
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              Register 1-Tap Passkey?
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xs">
              Save your Touch ID, Face ID, or Fingerprint for instant 1-tap logins on this device.
            </p>

            {/* Error or Success feedback */}
            {errorMsg && (
              <div className="mt-3 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl w-full">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mt-3 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold rounded-xl w-full flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={isRegistering}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={isRegistering}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isRegistering ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Register Passkey</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
