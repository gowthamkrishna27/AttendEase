import { useEffect } from 'react';
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
 */
export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Wait until auth state is definitively loaded
    if (authLoading || !publicId) return;

    // 1. If not authenticated, prompt login with post-login return redirect
    if (!user) {
      navigate(`/login?redirect=/share/${encodeURIComponent(publicId)}`, { replace: true });
      return;
    }

    // 2. Direct authenticated role routing
    if (user.role === 'faculty') {
      navigate(`/faculty/review/${encodeURIComponent(publicId)}`, { replace: true });
      return;
    }

    if (user.role === 'hod' || user.role === 'admin') {
      navigate(`/hod/review/${encodeURIComponent(publicId)}`, { replace: true });
      return;
    }

    if (user.role === 'student') {
      navigate(`/student/request/${encodeURIComponent(publicId)}`, { replace: true });
      return;
    }

    // Default fallback
    navigate('/', { replace: true });
  }, [authLoading, user, publicId, navigate]);

  // Clean loading screen while resolving authentication
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 font-sans">
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
