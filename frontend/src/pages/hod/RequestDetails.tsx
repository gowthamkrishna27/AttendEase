import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, FileText, CreditCard,
  Building2, GraduationCap, Check, X, ShieldAlert, RotateCcw
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/shared/Modal';
import { formatDate, formatTime } from '../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

export default function HODRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequest(id!),
    enabled: Boolean(id),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'approve' | 'reject'; reason?: string }) =>
      api.reviewRequest(id!, action, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['request', id] });
      setConfirmModal(null);
      setRejectionReason('');
    },
  });

  if (isLoading) {
    return (
      <PageWrapper role="hod">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[14px] text-[#6B7280]">Loading request details...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!request) {
    return (
      <PageWrapper role="hod">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/hod')}>
            Back to Overview
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
    <PageWrapper role="hod">
      <div className="max-w-xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Overview
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111111]">{request.reasonLabel}</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Assigned to {request.faculty?.name || '—'}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Student info — profile card style (Flush photo fit) */}
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

        {/* Faculty info */}
        <div className="card p-5 mb-4">
          <p className="text-[13px] font-medium text-[#6B7280] mb-3">
            Assigned Faculty ({request.faculties?.length || 1})
          </p>
          <div className="flex flex-col gap-3">
            {(request.faculties && request.faculties.length > 0 ? request.faculties : [request.faculty]).map((fac, idx) => (
              <div key={fac?.id || idx} className="flex items-center gap-4 py-1 border-b border-slate-50 last:border-0">
                <Avatar
                  name={fac?.name || 'F'}
                  src={fac?.avatarUrl}
                  size="md"
                  role="faculty"
                />
                <div>
                  <p className="text-[14px] font-semibold text-[#111111]">{fac?.name || 'Department Faculty'}</p>
                  <p className="text-[12px] text-[#6B7280]">
                    {fac?.designation || 'Faculty Member'} · {fac?.department} · {fac?.email}
                  </p>
                </div>
              </div>
            ))}
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
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Document</p>
                  <p className="text-[14px] font-medium text-[#111111]">{request.documentName}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="card p-5 mb-4">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">Description</p>
          <p className="text-[15px] text-[#111111] leading-relaxed">{request.description}</p>
        </div>

        {/* Rejection reason */}
        {request.status === 'rejected' && request.rejectionReason && (
          <div className="bg-danger/5 border border-danger/20 rounded-xl px-5 py-4 mb-4">
            <p className="text-[13px] font-medium text-danger mb-1">Rejection Reason</p>
            <p className="text-[14px] text-[#111111]">{request.rejectionReason}</p>
          </div>
        )}

        {/* HOD Executive Control Panel — Force Edit / Overrides */}
        <div className="card p-5 mb-6 border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={18} className="text-amber-600" />
            <h3 className="text-[15px] font-bold text-slate-900">
              HOD Executive Override Controls
            </h3>
          </div>
          <p className="text-[13px] text-slate-600 mb-4">
            As Head of Department, you have full authority to approve, reject, or force edit the decision on this request at any time.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {currentStatus !== 'approved' && (
              <Button
                variant="primary"
                size="md"
                className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm shadow-orange-500/25 font-semibold active:scale-[0.98]"
                onClick={() => setConfirmModal('approve')}
              >
                <Check size={16} className="mr-1" />
                {currentStatus === 'pending' ? 'Approve Request' : 'Force Approve'}
              </Button>
            )}

            {currentStatus !== 'rejected' && (
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
                onClick={() => setConfirmModal('reject')}
              >
                <X size={16} className="mr-1" />
                {currentStatus === 'pending' ? 'Reject Request' : 'Force Reject'}
              </Button>
            )}

            {currentStatus === 'approved' && (
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
                onClick={() => setConfirmModal('reject')}
              >
                <RotateCcw size={16} className="mr-1" />
                Change to Reject
              </Button>
            )}

            {currentStatus === 'rejected' && (
              <Button
                variant="primary"
                size="md"
                className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm shadow-orange-500/25 font-semibold active:scale-[0.98]"
                onClick={() => setConfirmModal('approve')}
              >
                <RotateCcw size={16} className="mr-1" />
                Change to Approve
              </Button>
            )}
          </div>
        </div>

        <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/hod')}>
          Back to Overview
        </Button>
      </div>

      {/* Confirmation / Rejection Modal */}
      <Modal
        isOpen={Boolean(confirmModal)}
        onClose={() => { setConfirmModal(null); setRejectionReason(''); }}
        title={
          confirmModal === 'approve'
            ? currentStatus === 'pending' ? 'Confirm Approval' : 'Force Approve Request'
            : currentStatus === 'pending' ? 'Confirm Rejection' : 'Force Reject Request'
        }
      >
        <p className="text-[14px] text-[#6B7280] mb-4">
          {confirmModal === 'approve'
            ? `Are you sure you want to ${currentStatus !== 'pending' ? 'override and ' : ''}approve this permission request for ${request.student?.name}?`
            : `Are you sure you want to ${currentStatus !== 'pending' ? 'override and ' : ''}reject this permission request for ${request.student?.name}?`}
        </p>

        {confirmModal === 'reject' && (
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Rejection Reason (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full text-[14px] p-3 border border-[#E5E7EB] rounded-xl outline-none focus:border-orange-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => { setConfirmModal(null); setRejectionReason(''); }}
            disabled={reviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className={confirmModal === 'reject' ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 font-semibold'}
            onClick={handleConfirm}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending
              ? 'Processing...'
              : confirmModal === 'approve' ? 'Approve Request' : 'Reject Request'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
