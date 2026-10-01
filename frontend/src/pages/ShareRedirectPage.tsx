import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/**
 * ShareRedirectPage — Smart gateway for shared request passes.
 *
 * Routing Rules:
 *  1. Not Logged In     -> /login?redirect=/share/:publicId
 *  2. Faculty Member    -> /faculty/review/:publicId
 *  3. HOD / Admin       -> /hod/review/:publicId
 *  4. Student           -> /student/request/:publicId
 *
 * Mobile fix: A 5-second timeout ensures we don't spin forever if the
 * background token-revalidation call hangs on a slow mobile connection.
 */
export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Safety valve: if auth check takes >5s on a slow mobile network, redirect to login
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Wait until auth state is definitively loaded (or timed out on mobile)
    if ((authLoading && !timedOut) || !publicId) return;

    const encodedId = encodeURIComponent(publicId);

    // 1. If not authenticated, prompt login with post-login return redirect
    if (!user) {
      navigate(`/login?redirect=/share/${encodedId}`, { replace: true });
      return;
    }

    // 2. Direct authenticated role routing
    if (user.role === 'faculty') {
      navigate('/faculty/requests', { replace: true });
      return;
    }

    if (user.role === 'hod' || user.role === 'admin') {
      navigate('/hod/requests', { replace: true });
      return;
    }

    if (user.role === 'student') {
      navigate('/student/history', { replace: true });
      return;
    }

    // Default fallback
    navigate('/', { replace: true });
  }, [authLoading, timedOut, user, publicId, navigate]);

  // Clean loading screen while resolving authentication
  // min-h-[100dvh] accounts for mobile browser chrome (address bar shrink/expand)
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center gap-3 font-sans">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xl flex items-center justify-center text-orange-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-sm font-extrabold text-slate-900">Opening Request...</p>
        <p className="text-[11px] font-medium text-slate-400">Verifying session and redirecting</p>
      </div>
    </div>
  );
}

