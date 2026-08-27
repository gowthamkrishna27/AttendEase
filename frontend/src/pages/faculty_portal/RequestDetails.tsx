import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/shared/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export default function FacultyRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      try {
        return await api.getRequest(id!);
      } catch (err) {
        const cachedList = queryClient.getQueryData<api.AttendanceRequest[]>(['requests']) || [];
        const cached = cachedList.find(r => r.id === id || (r as any).requestId === id);
        if (cached) return cached;
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });

  const invalidateAllRelatedQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['requests'] });
    void queryClient.invalidateQueries({ queryKey: ['facultyRequests'] });
    void queryClient.invalidateQueries({ queryKey: ['studentRequests'] });
    void queryClient.invalidateQueries({ queryKey: ['public-approved-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
    void queryClient.invalidateQueries({ queryKey: ['attendanceSubmissions'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const reviewMutation = useMutation({
    mutationFn: (payload: { action: 'approve' | 'reject'; reason?: string }) =>
      api.reviewRequest(id!, payload.action, payload.reason),
    onSuccess: (updatedReq) => {
      queryClient.setQueryData(['request', id], updatedReq);
      invalidateAllRelatedQueries();
      setConfirmModal(null);
      setRejectionReason('');
    },
  });

  const [originalPeriodsList, setOriginalPeriodsList] = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [isEditPeriodsOpen, setIsEditPeriodsOpen] = useState(false);

  const requestOriginalPeriods = request?.originalPeriods || request?.periods;
  if (requestOriginalPeriods && originalPeriodsList.length === 0) {
    const parsed = requestOriginalPeriods.split(',').map((p: string) => parseInt(p.trim())).filter((n: number) => !isNaN(n));
    if (parsed.length > 0) {
      setOriginalPeriodsList(parsed);
      setSelectedPeriods(parsed);
    }
  }

  const togglePeriod = (p: number) => {
    setSelectedPeriods(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const updatePeriodsMutation = useMutation({
    mutationFn: (periods: string) => api.updateRequest(id!, { periods }),
    onSuccess: (updatedReq) => {
      queryClient.setQueryData(['request', id], updatedReq);
      invalidateAllRelatedQueries();
      setIsEditPeriodsOpen(false);
    },
    onError: (err: any) => {
      alert(err?.message || 'Failed to update periods.');
    }
  });

  const handleSavePeriods = () => {
    if (selectedPeriods.length === 0) {
      alert('Please select at least one period.');
      return;
    }
    const sorted = [...selectedPeriods].sort((a, b) => a - b);
    const periodsStr = sorted.join(',');
    updatePeriodsMutation.mutate(periodsStr);
  };

  if (isLoading) {
    return (
      <PageWrapper role="faculty" showGreeting={false}>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Loading...</p>
        </div>
      </PageWrapper>
    );
  }

  if (isError || !request) {
    return (
      <PageWrapper role="faculty" showGreeting={false}>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/faculty')}>
            Back to Dashboard
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const loggedInUserId = (user?.id || '').toLowerCase().trim();
  const loggedInUserCustomId = ((user as any)?.userId || '').toLowerCase().trim();
  const loggedInUserEmail = (user?.email || '').toLowerCase().trim();

  const primaryFacId = (request?.facultyId || '').toLowerCase().trim();
  const primaryFacEmail = (request?.faculty?.email || '').toLowerCase().trim();
  const assignedFacultyIds = (request?.facultyIds || []).map((fid: string) => fid.toLowerCase().trim());
  const assignedEmails = (request?.faculties || []).map((f: any) => (f.email || '').toLowerCase().trim());

  const isAssigned =
    loggedInUserId === primaryFacId ||
    loggedInUserCustomId === primaryFacId ||
    loggedInUserEmail === primaryFacEmail ||
    assignedFacultyIds.includes(loggedInUserId) ||
    assignedFacultyIds.includes(loggedInUserCustomId) ||
    assignedEmails.includes(loggedInUserEmail);

  const isRequestClosed = (() => {
    if (!request?.date) return false;
    const targetDateStr = request.endDate || request.date;
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(23, 59, 59, 999);
    return new Date() > targetDate;
  })();

  const currentStatus = request.status;



  const handleConfirm = () => {
    reviewMutation.mutate({
      action: confirmModal === 'approve' ? 'approve' : 'reject',
      reason: confirmModal === 'reject' ? rejectionReason : undefined,
    });
  };

  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <div className="max-w-xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111111]">
              {request.reasonLabel}
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Submitted {formatDate(request.submittedAt)}
            </p>
          </div>
          <StatusBadge status={currentStatus} finalDecisionBy={request.finalDecisionBy} finalDecisionName={request.finalDecisionName} />
        </div>

        {/* Unassigned Faculty View Only Banner */}
        {!isAssigned && (
          <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between text-[13px] text-amber-950 font-medium shadow-2xs">
            <div>
              <p className="font-bold text-[14px] text-amber-950 flex items-center gap-1.5">
                👁️ View-Only Access (Non-Assigned Faculty)
              </p>
              <p className="text-[12px] text-amber-800 mt-0.5">
                You are viewing this request in read-only mode. Assigned reviewer: <span className="font-bold text-amber-950">{request.faculty?.name || 'Assigned Faculty'}</span>.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-200/80 text-amber-950 font-bold text-[11px] rounded-lg shrink-0">
              Read Only
            </span>
          </div>
        )}

        {/* HOD Decision Banner */}
        {request.finalDecisionBy === 'HOD' && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-[13px] text-purple-900 font-medium shadow-2xs">
            <div>
              <p className="font-bold text-[14px] text-purple-950 flex items-center gap-1.5">
                👑 Official Decision by Head of Department (HOD)
              </p>
              <p className="text-[12px] text-purple-700 mt-0.5">
                Head of Department (HOD) holds the official rights to override permission requests.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-purple-600 text-white font-bold text-[11px] rounded-lg shrink-0">
              HOD Overridden
            </span>
          </div>
        )}

        {/* Student info card */}
        <div
          className="mb-6 flex flex-row items-stretch"
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #E8ECF0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Photo */}
          <div className="w-28 sm:w-32 flex-shrink-0 relative bg-slate-100 flex items-center justify-center overflow-hidden">
            {request.student?.avatarUrl ? (
              <img
                src={request.student.avatarUrl}
                alt={request.student.name}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 text-3xl font-bold -z-10">
              {(request.student?.name || 'S').charAt(0)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-4 sm:px-5 sm:py-4 flex flex-col justify-center gap-1.5">
            <p className="text-[17px] font-heading font-bold text-slate-900">
              {request.student?.name}
            </p>
            <p className="text-[13px] text-slate-500">
              Roll No: <span className="font-bold text-slate-800">{request.student?.rollNumber}</span>
            </p>
            <p className="text-[13px] text-slate-500">
              Department: <span className="font-bold text-slate-800">{request.student?.department}</span>
            </p>
            <p className="text-[13px] text-slate-500">
              Semester: <span className="font-bold text-slate-800">{request.student?.semester ? `${request.student.semester}th Sem` : '—'}</span>
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-[#6B7280]" />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280] mb-0.5">Date</p>
                <p className="text-[14px] font-medium text-[#111111]">{formatDate(request.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <Clock size={15} className="text-[#6B7280]" />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280] mb-0.5">Time</p>
                <p className="text-[14px] font-medium text-[#111111]">
                  {formatTime(request.startTime)} – {formatTime(request.endTime)}
                </p>
                {request.periods && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] font-semibold text-orange-600">
                      Periods: {request.periods}
                    </p>
                    {isAssigned && !isRequestClosed && (
                      <button
                        onClick={() => {
                          const targetPeriodsStr = request.originalPeriods || request.periods || '';
                          const originalParsed = targetPeriodsStr.split(',').map((p: string) => parseInt(p.trim())).filter((n: number) => !isNaN(n));
                          setSelectedPeriods(originalParsed);
                          setIsEditPeriodsOpen(true);
                        }}
                        className="text-[16px] font-black text-black hover:text-orange-500 hover:bg-slate-100 hover:scale-105 active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-full -ml-0.5"
                        title="Edit granted periods"
                      >
                        ✎
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Student Proof Document Section */}
            {(() => {
              const docName = request.documentName || (request.reason !== 'other' ? `${request.reason}_Permission_Proof.pdf` : 'Attendance_Request_Proof.pdf');
              return (
                <div className="flex items-start gap-3 sm:col-span-2 bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/80">
                  <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[12px] font-bold text-orange-600 uppercase tracking-wider">Uploaded Student Proof Document</p>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-200/70 px-2 py-0.5 rounded-full">Proof Attached</span>
                    </div>
                    <p className="text-[14px] font-semibold text-slate-900 truncate">{docName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => alert(`Previewing uploaded proof document: ${docName}`)}
                        className="text-[12px] font-bold text-orange-600 hover:text-orange-800 underline underline-offset-2 flex items-center gap-1 transition-colors"
                      >
                        👁️ Preview Proof
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => alert(`Downloading proof document: ${docName}`)}
                        className="text-[12px] font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 flex items-center gap-1 transition-colors"
                      >
                        📥 Download File
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Description */}
        <div className="card p-5 mb-6">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">Description</p>
          <p className="text-[15px] text-[#111111] leading-relaxed">{request.description}</p>
        </div>

        {/* Actions — show Approve/Reject if pending, show Reject if approved, show Approve if rejected */}
        {isAssigned && !isRequestClosed && (
          currentStatus === 'pending' ? (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1 border-danger/30 text-danger hover:bg-danger/5"
                onClick={() => setConfirmModal('reject')}
              >
                Reject
              </Button>
              <Button
                size="lg"
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 border-none font-semibold active:scale-[0.98]"
                onClick={() => setConfirmModal('approve')}
              >
                Approve Request
              </Button>
            </div>
          ) : currentStatus === 'approved' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl px-5 py-4 text-center border bg-success/5 border-success/20">
                <p className="text-[15px] font-semibold text-success">
                  ✓ Request Approved
                </p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="w-full border-danger/30 text-danger hover:bg-danger/5"
                onClick={() => setConfirmModal('reject')}
              >
                Reject Request
              </Button>
            </div>
          ) : currentStatus === 'rejected' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl px-5 py-4 text-center border bg-danger/5 border-danger/20">
                <p className="text-[15px] font-semibold text-danger">
                  ✗ Request Rejected
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 border-none font-semibold active:scale-[0.98]"
                onClick={() => setConfirmModal('approve')}
              >
                Approve Request
              </Button>
            </div>
          ) : null
        )}

        {/* If the request status is not pending and we are either unassigned or it is closed, show standard status banner */}
        {(!isAssigned || isRequestClosed) && currentStatus !== 'pending' && (
          <div className={`rounded-xl px-5 py-4 text-center border ${currentStatus === 'approved'
            ? 'bg-success/5 border-success/20'
            : 'bg-danger/5 border-danger/20'
            }`}>
            <p className={`text-[15px] font-semibold ${currentStatus === 'approved' ? 'text-success' : 'text-danger'
              }`}>
              {currentStatus === 'approved' ? '✓ Request Approved' : '✗ Request Rejected'}
            </p>
          </div>
        )}

        {/* Read-only banner for unassigned faculty on pending requests */}
        {!isAssigned && currentStatus === 'pending' && (
          <div className="rounded-xl px-5 py-4 text-center border bg-slate-50 border-slate-200">
            <p className="text-[14px] font-semibold text-slate-500">
              Read-Only View (Not Assigned to You)
            </p>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <Modal
        open={confirmModal !== null}
        onClose={() => setConfirmModal(null)}
        title={confirmModal === 'approve' ? 'Approve Request?' : 'Reject Request?'}
        description={
          confirmModal === 'approve'
            ? 'This will approve the attendance permission request for the student.'
            : 'This will reject the attendance permission request.'
        }
        size="sm"
      >
        {confirmModal === 'reject' && (
          <div className="mt-3 mb-2">
            <label className="text-[12px] font-semibold text-slate-600 block mb-1">Reason for Rejection (Optional)</label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Exam scheduled on the same day..."
              rows={2}
              className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
            />
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setConfirmModal(null)}
            disabled={reviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={confirmModal === 'reject' ? 'danger' : 'primary'}
            size="md"
            className="flex-1"
            loading={reviewMutation.isPending}
            onClick={handleConfirm}
          >
            {confirmModal === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>

      {/* Edit Periods Modal */}
      <Modal
        open={isEditPeriodsOpen}
        onClose={() => setIsEditPeriodsOpen(false)}
        title="Edit Granted Periods"
        description="Select or deselect periods to grant permission only for the selected ones. Saving will automatically approve the request for these periods."
        size="sm"
      >
        <div className="py-4">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Select Periods ({selectedPeriods.length} selected)
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {originalPeriodsList.map(p => {
              const isSel = selectedPeriods.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePeriod(p)}
                  className={`h-11 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center ${
                    isSel
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Period {p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setIsEditPeriodsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            onClick={handleSavePeriods}
            loading={updatePeriodsMutation.isPending}
          >
            Save & Grant
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
