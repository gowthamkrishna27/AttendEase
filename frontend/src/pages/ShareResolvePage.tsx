import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';

/**
 * ShareResolvePage — Canonical Resolver for /r/:shareToken
 * 
 * Flow:
 * 1. Checks token format.
 * 2. If unauthenticated -> redirects to /login?redirect=/r/:shareToken
 * 3. If authenticated -> calls backend GET /api/share/token/:shareToken
 * 4. On authorization success -> redirects to authorized portal page:
 *    - Student Owner -> /student/request/:id (Read-Only)
 *    - Authorized Faculty -> /faculty/review/:id
 *    - Authorized HOD/Admin -> /hod/review/:id
 * 5. On authorization failure / revoked link -> displays secure error state without leaking metadata.
 */
export default function ShareResolvePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isResolving, setIsResolving] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);

  useEffect(() => {
    // Wait until auth state rehydration completes
    if (authLoading) return;

    if (!shareToken || !/^[a-zA-Z0-9_-]{6,64}$/.test(shareToken.trim())) {
      setIsResolving(false);
      setErrorMessage("Request not found or you don't have permission to view it.");
      return;
    }

    const cleanToken = shareToken.trim();

    // 1. Unauthenticated users are redirected to login with safe redirect back to /r/:shareToken
    if (!isAuthenticated || !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/r/${cleanToken}`)}`, { replace: true });
      return;
    }

    // 2. Authenticated user -> resolve token on backend
    let isMounted = true;
    setIsResolving(true);
    setErrorMessage(null);

    api.resolveShareToken(cleanToken)
      .then((res) => {
        if (!isMounted) return;

        if (res.success && res.authorized) {
          // Clean destination routing -> existing authenticated views
          if (res.destination === 'STUDENT_VIEW' || user?.role === 'student') {
            navigate('/student/history', { replace: true });
          } else if (res.destination === 'FACULTY_REVIEW' || user?.role === 'faculty') {
            navigate('/faculty/requests', { replace: true });
          } else if (res.destination === 'HOD_REVIEW' || res.destination === 'ADMIN_REVIEW' || user?.role === 'hod' || user?.role === 'admin') {
            navigate('/hod/requests', { replace: true });
          } else if (res.redirectPath) {
            navigate(res.redirectPath, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else if (!res.authenticated && res.redirectUrl) {
          // Token expired or invalid session -> prompt login
          navigate(res.redirectUrl, { replace: true });
        } else {
          // Unauthorized or revoked
          setIsResolving(false);
          setIsRevoked(Boolean(res.isRevoked));
          setErrorMessage(res.error || "Request not found or you don't have permission to view it.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsResolving(false);
        setErrorMessage("Request not found or you don't have permission to view it.");
        console.warn('Share resolve error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken, isAuthenticated, user, authLoading, navigate]);

  // Loading state
  if (authLoading || isResolving) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3.5 font-sans selection:bg-orange-100 p-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-xl flex items-center justify-center text-orange-500">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full"
            />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[15px] font-bold text-slate-900">Verifying Request Pass...</p>
          <p className="text-[12px] font-medium text-slate-400">Authenticating permissions securely</p>
        </div>
      </div>
    );
  }

  // Error / Unauthorized / Revoked state
  const dashboardHome = user?.role === 'faculty' ? '/faculty' : user?.role === 'hod' || user?.role === 'admin' ? '/hod' : '/student';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans selection:bg-orange-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-lg shadow-slate-100 flex flex-col items-center"
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isRevoked ? 'bg-amber-50 text-amber-600 border border-amber-200/60' : 'bg-red-50 text-red-500 border border-red-200/60'}`}>
          {isRevoked ? <Lock size={26} strokeWidth={2.2} /> : <ShieldAlert size={26} strokeWidth={2.2} />}
        </div>

        <h2 className="text-[19px] font-extrabold text-slate-900 tracking-tight mb-2">
          {isRevoked ? 'Link No Longer Available' : 'Access Restricted'}
        </h2>

        <p className="text-[13.5px] text-slate-500 leading-relaxed mb-6 max-w-[320px]">
          {errorMessage || (isRevoked ? 'This sharing link has been revoked or expired.' : "Request not found or you don't have permission to view it.")}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={() => navigate(dashboardHome, { replace: true })}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-[13.5px] font-bold shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Go to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-[13.5px] font-bold border border-slate-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
