import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShieldAlert, LogOut, LayoutDashboard, Lock } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * ShareRedirectPage — Smart authorization & redirect gateway.
 *
 * Behavior:
 *  1. If unauthenticated -> forwards to /login?redirect=/share/:publicId
 *  2. If authenticated:
 *     - HOD / Admin       -> /hod/review/:id
 *     - Assigned Faculty  -> /faculty/review/:id
 *     - Request Owner     -> /student/request/:id
 *     - Other Account     -> Clean "Access Restricted" screen with 1-tap "Switch Account"
 */
export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // 1. If auth is resolved and no user is logged in, redirect to login
  useEffect(() => {
    if (!authLoading && !user && publicId) {
      navigate(`/login?redirect=/share/${encodeURIComponent(publicId)}`, { replace: true });
    }
  }, [authLoading, user, publicId, navigate]);

  // 2. Fetch pass details when user is authenticated
  const { data: shareData, isError, isLoading: queryLoading } = useQuery({
    queryKey: ['share-pass', publicId, user?.id ?? 'guest'],
    queryFn: () => api.getSharePassView(publicId!),
    enabled: !authLoading && !!user && !!publicId,
    staleTime: 0,
    retry: 1,
  });

  useEffect(() => {
    if (authLoading || queryLoading || !shareData || !user) return;

    const authInfo = shareData.authInfo ?? {};
    const request  = shareData.request;
    const id       = request?.publicId || request?.id || publicId!;

    // ① HOD or Admin can view and review all requests
    if (user.role === 'hod' || user.role === 'admin' || authInfo.isHOD) {
      navigate(`/hod/review/${id}`, { replace: true });
      return;
    }

    // ② Student owner check
    if (user.role === 'student') {
      const userRoll = (user.rollNumber || '').toUpperCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = (user.id || user.userId || '').toLowerCase().trim();

      const reqRoll = (request?.student?.rollNumber || request?.studentId || '').toUpperCase().trim();
      const reqEmail = (request?.student?.email || '').toLowerCase().trim();
      const reqStudentId = (request?.studentId || request?.student?.id || '').toLowerCase().trim();

      const isOwner =
        authInfo.isStudentOwner ||
        (userRoll && reqRoll && userRoll === reqRoll) ||
        (userEmail && reqEmail && userEmail === reqEmail) ||
        (userId && reqStudentId && (userId === reqStudentId || reqStudentId.includes(userId)));

      if (isOwner) {
        navigate(`/student/request/${id}`, { replace: true });
        return;
      } else {
        setIsUnauthorized(true);
        return;
      }
    }

    // ③ Faculty assignment check
    if (user.role === 'faculty') {
      const userId = (user.id || user.userId || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      const userName = (user.name || '').toLowerCase().trim();

      const primaryFacId = (request?.facultyId || request?.faculty?.id || '').toLowerCase().trim();
      const primaryEmail = (request?.faculty?.email || '').toLowerCase().trim();
      const primaryName = (request?.faculty?.name || '').toLowerCase().trim();

      const assignedEmails = (request?.faculties || []).map(f => (f.email || '').toLowerCase().trim());
      const assignedIds = (request?.faculties || []).map(f => (f.id || f.userId || '').toLowerCase().trim());
      const assignedNames = (request?.faculties || []).map(f => (f.name || '').toLowerCase().trim());

      const isAssigned =
        authInfo.isAssignedFaculty ||
        (primaryFacId && userId && primaryFacId === userId) ||
        (primaryEmail && userEmail && primaryEmail === userEmail) ||
        (primaryName && userName && (primaryName.includes(userName) || userName.includes(primaryName))) ||
        assignedIds.includes(userId) ||
        assignedEmails.includes(userEmail) ||
        assignedNames.some(n => n && userName && (n.includes(userName) || userName.includes(n)));

      if (isAssigned) {
        navigate(`/faculty/review/${id}`, { replace: true });
        return;
      } else {
        setIsUnauthorized(true);
        return;
      }
    }

    setIsUnauthorized(true);
  }, [authLoading, queryLoading, shareData, user, navigate, publicId]);

  const handleSwitchAccount = () => {
    logout();
    navigate(`/login?redirect=/share/${encodeURIComponent(publicId!)}`, { replace: true });
  };

  const handleGoHome = () => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const roleHome: Record<string, string> = {
      student: '/student',
      faculty: '/faculty',
      hod: '/hod',
      admin: '/admin',
    };
    navigate(roleHome[user.role] || '/', { replace: true });
  };

  // If request ID is completely invalid
  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-black text-slate-900">Invalid Request Link</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This attendance permission pass does not exist or has expired.
          </p>
          <button
            onClick={handleGoHome}
            className="w-full h-11 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If logged in with another user who is not assigned
  if (isUnauthorized && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-white rounded-3xl p-7 max-w-md w-full text-center shadow-xl border border-slate-200 space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Lock size={26} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This permission request is private and only accessible by the assigned faculty, HOD, or the student who submitted it.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1 text-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
            <p className="font-extrabold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 capitalize">{user.email} • {user.role}</p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleSwitchAccount}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition-all cursor-pointer border-none"
            >
              <LogOut size={15} />
              <span>Switch Account</span>
            </button>
            <button
              onClick={handleGoHome}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-none"
            >
              <LayoutDashboard size={15} />
              <span>Go to My Dashboard</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Clean animated checking authorization screen
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 font-sans">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xl flex items-center justify-center text-orange-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-sm font-extrabold text-slate-900">Authorizing Access...</p>
        <p className="text-[11px] font-medium text-slate-400">Verifying your permissions securely</p>
      </div>
    </div>
  );
}
