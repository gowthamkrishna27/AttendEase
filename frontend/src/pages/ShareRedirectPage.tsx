import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * ShareRedirectPage — pure redirect handler, no UI content.
 *
 * Routing rules:
 *  ① Student owner            → /student/request/:id
 *  ② Assigned faculty (auth)  → /faculty/review/:id
 *  ③ HOD / admin (auth)       → /hod/review/:id
 *  ④ Not logged in            → /login?redirect=/share/:publicId
 *  ⑤ Any other user           → /404
 */
export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: shareData, isError } = useQuery({
    queryKey: ['share-pass', publicId],
    queryFn: () => api.getSharePassView(publicId!),
    enabled: !!publicId,
    staleTime: 10 * 1000,
    retry: 1,
  });

  useEffect(() => {
    // Wait for auth rehydration + share data
    if (authLoading || !shareData) return;

    const authInfo = shareData.authInfo ?? {};
    const request  = shareData.request;
    const id       = request?.publicId || request?.id || publicId!;

    const { isStudentOwner, isAssignedFaculty, isHOD } = authInfo;

    if (!user) {
      // ④ Not logged in → send to login, come back after
      navigate(`/login?redirect=/share/${publicId}`, { replace: true });
      return;
    }

    if (isStudentOwner) {
      // ① Owner student → student request detail page
      navigate(`/student/request/${id}`, { replace: true });
      return;
    }

    if (isAssignedFaculty) {
      // ② Assigned faculty → faculty review card
      navigate(`/faculty/review/${id}`, { replace: true });
      return;
    }

    if (isHOD) {
      // ③ HOD / admin → HOD review card
      navigate(`/hod/review/${id}`, { replace: true });
      return;
    }

    // ⑤ Anyone else → 404
    navigate('/404', { replace: true });
  }, [authLoading, shareData, user, navigate, publicId]);

  // Error fetching request (invalid link)
  if (isError) {
    navigate('/404', { replace: true });
    return null;
  }

  // Loading spinner while resolving
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-center text-orange-500 animate-pulse">
        <Sparkles size={24} />
      </div>
      <p className="text-sm font-bold text-slate-800">Redirecting...</p>
    </div>
  );
}
