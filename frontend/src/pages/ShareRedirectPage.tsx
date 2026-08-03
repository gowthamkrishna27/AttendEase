import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { ShieldAlert, FileQuestion, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [statusState, setStatusState] = useState<'loading' | 'forbidden' | 'notfound' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Wait for auth initialization
    if (authLoading) return;

    // If guest / unauthenticated, preserve current location in state and redirect to login
    if (!user) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    if (!publicId) {
      setStatusState('notfound');
      return;
    }

    let isMounted = true;

    async function checkShareAccess() {
      try {
        const res = await api.getShareRedirect(publicId!);
        if (!isMounted) return;

        if (res.success && res.redirectTo) {
          navigate(res.redirectTo, { replace: true });
        } else if (res.status === 404) {
          setStatusState('notfound');
        } else if (res.status === 403) {
          setStatusState('forbidden');
        } else {
          setStatusState('error');
          setErrorMessage(res.error || 'Unable to process share link.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const statusCode = err?.status || err?.response?.status;
        if (statusCode === 403) {
          setStatusState('forbidden');
        } else if (statusCode === 404) {
          setStatusState('notfound');
        } else {
          setStatusState('error');
          setErrorMessage(err?.message || 'Server error while resolving share link.');
        }
      }
    }

    checkShareAccess();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, publicId, navigate, location]);

  if (authLoading || statusState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Validating Permission Request</h2>
        <p className="text-sm text-slate-500 mt-1">Verifying your security credentials...</p>
      </div>
    );
  }

  if (statusState === 'forbidden') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            You do not have authorization to view this attendance request. Shared request links are strictly restricted to the assigned student, designated faculty reviewers, and HOD.
          </p>
          <Link
            to={user?.role ? `/${user.role}` : '/login'}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (statusState === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <FileQuestion size={32} />
          </div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            404 Not Found
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4 mb-2">Request Not Found</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The shared request link is invalid, expired, or may have been removed.
          </p>
          <Link
            to={user?.role ? `/${user.role}` : '/login'}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Unable to Open Link</h1>
        <p className="text-sm text-slate-500 mb-6">{errorMessage || 'An error occurred while validating the request link.'}</p>
        <Link
          to={user?.role ? `/${user.role}` : '/login'}
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-900 text-white font-bold text-sm rounded-xl"
        >
          <ArrowLeft size={16} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
