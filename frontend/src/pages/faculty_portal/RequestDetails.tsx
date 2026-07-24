import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, CreditCard, Building2, GraduationCap } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/shared/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';


export default function FacultyRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequest(id!),
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'approve' | 'reject'; reason?: string }) =>
      api.reviewRequest(id!, action, reason),
    onMutate: async ({ action }) => {
      await queryClient.cancelQueries({ queryKey: ['request', id] });
      await queryClient.cancelQueries({ queryKey: ['requests'] });

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      queryClient.setQueryData<api.AttendanceRequest>(['request', id], old =>
        old ? { ...old, status: newStatus as any } : old
      );

      queryClient.setQueryData<api.AttendanceRequest[]>(['requests'], old =>
        (old || []).map(r => r.id === id ? { ...r, status: newStatus as any } : r)
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['request', id] });
      setConfirmModal(null);
    },
  });

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
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111111]">
              {request.reasonLabel}
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Submitted {formatDate(request.submittedAt)}
            </p>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        {/* Student Info — profile card style (Flush photo fit) */}
        <div
          className="mb-6 flex flex-col sm:flex-row items-stretch"
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #EEF2F7',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Flush photo on left edge */}
          <div className="w-full sm:w-36 h-36 sm:h-auto flex-shrink-0 relative bg-slate-100 flex items-center justify-center overflow-hidden">
            {request.student?.avatarUrl ? (
              <img
                src={request.student.avatarUrl}
                alt={request.student.name}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold -z-10">
              {(request.student?.name || 'S').charAt(0)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-5 sm:px-6 sm:py-5 flex flex-col justify-center">
            <p className="text-[17px] font-heading font-bold text-slate-900 mb-1">
              {request.student?.name}
            </p>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11, fontWeight: 700,
                  color: '#EA580C',
                  background: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: 999,
                  padding: '2px 10px',
                  marginBottom: 12,
                }}
              >
                Student · {request.student?.department}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5">
                <CreditCard size={13} className="text-slate-400" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{request.student?.rollNumber}</p>
                  <p className="text-[10px] text-slate-400">Roll Number</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-400" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{request.student?.department}</p>
                  <p className="text-[10px] text-slate-400">Branch</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-slate-400" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">Sem {request.student?.semester}</p>
                  <p className="text-[10px] text-slate-400">Semester</p>
                </div>
              </div>
            </div>
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
              </div>
            </div>

            {request.documentName && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Attachment</p>
                  <p className="text-[14px] font-medium text-[#111111]">{request.documentName}</p>
                  <button className="text-[13px] text-[#111111] underline underline-offset-2 mt-0.5 hover:text-[#6B7280] transition-colors">
                    Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="card p-5 mb-6">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">Description</p>
          <p className="text-[15px] text-[#111111] leading-relaxed">{request.description}</p>
        </div>

        {/* Actions — only show if still pending */}
        {currentStatus === 'pending' && (
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
        )}

        {currentStatus !== 'pending' && (
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
    </PageWrapper>
  );
}
