import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/shared/Modal';
import { mockRequests } from '../../data/mock';
import { formatDate, formatTime } from '../../lib/utils';
import type { RequestStatus } from '../../types';

export default function FacultyRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [confirmModal, setConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const request = mockRequests.find(r => r.id === id);

  if (!request) {
    return (
      <PageWrapper role="faculty">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/faculty')}>
            Back to Dashboard
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const currentStatus = status || request.status;

  const handleConfirm = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setStatus(confirmModal === 'approve' ? 'approved' : 'rejected');
    setIsProcessing(false);
    setConfirmModal(null);
  };

  return (
    <PageWrapper role="faculty">
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

        {/* Student Info */}
        <div className="card p-5 mb-4">
          <p className="text-[13px] font-medium text-[#6B7280] mb-3">Student Information</p>
          <div className="flex items-center gap-4">
            <Avatar name={request.student?.name || 'S'} size="md" />
            <div>
              <p className="text-[15px] font-semibold text-[#111111]">{request.student?.name}</p>
              <p className="text-[13px] text-[#6B7280]">
                {request.student?.rollNumber} · {request.student?.department}
              </p>
              <p className="text-[13px] text-[#6B7280]">
                Semester {request.student?.semester} · {request.student?.email}
              </p>
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
              className="flex-[2]"
              onClick={() => setConfirmModal('approve')}
            >
              Approve Request
            </Button>
          </div>
        )}

        {currentStatus !== 'pending' && (
          <div className={`rounded-xl px-5 py-4 text-center border ${
            currentStatus === 'approved'
              ? 'bg-success/5 border-success/20'
              : 'bg-danger/5 border-danger/20'
          }`}>
            <p className={`text-[15px] font-semibold ${
              currentStatus === 'approved' ? 'text-success' : 'text-danger'
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
        <div className="flex gap-2 mt-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setConfirmModal(null)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={confirmModal === 'reject' ? 'danger' : 'primary'}
            size="md"
            className="flex-1"
            loading={isProcessing}
            onClick={handleConfirm}
          >
            {confirmModal === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
