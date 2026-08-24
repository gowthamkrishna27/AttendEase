import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, UserCheck, Eye, Download } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/shared/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTime, formatSubmittedAt } from '../../lib/utils';
import { ProofPreviewModal } from '../../components/shared/ProofPreviewModal';
import NotFound from '../NotFound';


export default function FacultyRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      try {
        return await api.getRequest(id!);
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { action: 'approve' | 'reject'; reason?: string }) =>
      api.reviewRequest(id!, payload.action, payload.reason),
    onSuccess: (updatedReq) => {
      queryClient.setQueryData(['request', id], updatedReq);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['facultyRequests'] });
      setConfirmModal(null);
      setRejectionReason('');
    },
  });

  if (isLoading) {
    return (
      <PageWrapper role="faculty" showGreeting={false}>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[14px] text-[#6B7280]">Loading request details...</p>
        </div>
      </PageWrapper>
    );
  }

  if (isError || !request) {
    return (
      <NotFound
        code="404"
        title="This attendance request could not be found."
      />
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
          onClick={() => navigate('/faculty/requests')}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Requests
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
                <p className="text-[13px] text-[#6B7280] mb-0.5">Time & Periods</p>
                <p className="text-[14px] font-medium text-[#111111]">
                  {formatTime(request.startTime)} – {formatTime(request.endTime)}
                </p>
                {request.periods && (
                  <p className="text-[11px] font-semibold text-orange-600 mt-0.5">
                    Periods: {request.periods}
                  </p>
                )}
              </div>
            </div>

            {/* Assigned Faculty */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 border border-orange-100">
                <UserCheck size={15} />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280] mb-0.5">Assigned Faculty</p>
                <p className="text-[14px] font-bold text-slate-900">
                  {request.faculty?.name || (request.faculties && request.faculties.length > 0 ? request.faculties.map((f: any) => f.name).join(', ') : 'Department Faculty')}
                </p>
              </div>
            </div>

            {/* Approved / Decided By (if reviewed) */}
            {request.status !== 'pending' && (
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                  request.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                  <UserCheck size={15} />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280] mb-0.5">
                    {request.status === 'approved' ? 'Approved By' : 'Rejected By'}
                  </p>
                  <p className={`text-[14px] font-bold ${
                    request.status === 'approved' ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {request.finalDecisionName || (request.finalDecisionBy === 'HOD' ? 'HOD' : request.faculty?.name || 'Faculty')}
                    <span className="text-[11px] font-semibold text-slate-400 ml-1.5 font-normal">
                      ({request.finalDecisionBy || 'Faculty'})
                    </span>
                  </p>
                </div>
              </div>
            )}

            {request.submittedAt && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                  <Clock size={15} className="text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Submitted On</p>
                  <p className="text-[14px] font-bold text-slate-900 font-mono">
                    {formatSubmittedAt(request.submittedAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Uploaded Student Proof Document Section (Only shown if student actually attached a file) */}
            {Boolean(request.documentName || request.documentUrl) && (
              <div className="flex items-start gap-3 sm:col-span-2 bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/80">
                <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[12px] font-bold text-orange-600 uppercase tracking-wider">Uploaded Student Proof Document</p>
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-200/70 px-2 py-0.5 rounded-full">Proof Attached</span>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{request.documentName || 'Uploaded_Proof_Document.pdf'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="text-[12px] font-bold text-orange-600 hover:text-orange-800 underline underline-offset-2 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Preview Proof</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <a
                      href={request.documentUrl || (request.documentName?.startsWith('http') ? request.documentName : undefined)}
                      download={request.documentName || 'proof_document'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const targetUrl = request.documentUrl || (request.documentName?.startsWith('http') ? request.documentName : null);
                        if (!targetUrl) {
                          e.preventDefault();
                          setIsPreviewOpen(true);
                        }
                      }}
                      className="text-[12px] font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download File</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <ProofPreviewModal
              isOpen={isPreviewOpen}
              onClose={() => setIsPreviewOpen(false)}
              documentUrl={request.documentUrl}
              documentName={request.documentName}
            />
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
