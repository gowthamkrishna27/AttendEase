import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { RefreshCw } from 'lucide-react';
import NotFound from './NotFound';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 font-sans text-slate-800">
        <div className="w-10 h-10 rounded-xl bg-[#edf0f2] text-[#18181b] flex items-center justify-center mb-3">
          <RefreshCw size={18} className="animate-spin" />
        </div>
        <p className="text-[13.5px] font-medium text-[#18181b]">Validating permission request...</p>
      </div>
    );
  }

  if (statusState === 'forbidden') {
    return (
      <NotFound
        code="403"
        title="You do not have authorization to view this request."
      />
    );
  }

  if (statusState === 'notfound') {
    return (
      <NotFound
        code="404"
        title="This permission slip could not be found or has expired."
      />
    );
  }

  return (
    <NotFound
      code="Error"
      title={errorMessage || 'An error occurred while validating the request link.'}
    />
  );
}
