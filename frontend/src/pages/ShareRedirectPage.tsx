import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * ShareRedirectPage — pure redirect handler.
 *
 * Flow:
 *  1. If not logged in -> redirect to /login?redirect=/share/:publicId
 *  2. If logged in:
 *     - HOD / Admin       -> /hod/review/:id
 *     - Assigned Faculty  -> /faculty/review/:id
 *     - Request Owner     -> /student/request/:id
 *     - Other users       -> /404
 */
export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // 1. If auth is resolved and no user is logged in, prompt login immediately
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

    // ② Student owner
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
      } else {
        navigate('/404', { replace: true });
      }
      return;
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
      } else {
        navigate('/404', { replace: true });
      }
      return;
    }

    navigate('/404', { replace: true });
  }, [authLoading, queryLoading, shareData, user, navigate, publicId]);

  if (isError) {
    navigate('/404', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-center text-orange-500 animate-pulse">
        <Sparkles size={24} />
      </div>
      <p className="text-sm font-bold text-slate-800">Checking authorization...</p>
    </div>
  );
}
