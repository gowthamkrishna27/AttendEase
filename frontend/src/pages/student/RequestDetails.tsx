import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, User, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { WhatsAppShareButton } from '../../components/shared/WhatsAppShareButton';
import { Button } from '../../components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTime, formatSubmittedAt } from '../../lib/utils';
import { ProofPreviewModal } from '../../components/shared/ProofPreviewModal';
import { EditRequestModal } from '../../components/shared/EditRequestModal';
import { useState } from 'react';

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequest(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageWrapper role="student">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 14 }}>Loading...</div>
      </PageWrapper>
    );
  }

  if (isError || !request) {
    return (
      <PageWrapper role="student">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/student/history')}>
            Back to History
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const timelineSteps = [
    {
      label: 'Submitted',
      done: true,
      date: request.submittedAt,
    },
    {
      label: 'Faculty Review',
      done: request.status !== 'pending',
      date: request.reviewedAt,
    },
    {
      label: request.status === 'rejected' ? 'Rejected' : 'Approved',
      done: request.status !== 'pending',
      date: request.reviewedAt,
      isLast: true,
    },
  ];

  return (
    <PageWrapper role="student">
      <div className="max-w-xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/student/history')}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to History
        </button>

        {/* Title row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111111]">
              {request.reasonLabel}
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Submitted to {request.faculty?.name || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} finalDecisionBy={request.finalDecisionBy} finalDecisionName={request.finalDecisionName} />
          </div>
        </div>

        {/* Info grid */}
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-[#6B7280]" />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280] mb-0.5">Student</p>
                <p className="text-[14px] font-medium text-[#111111]">
                  {request.student?.name}
                </p>
                <p className="text-[13px] text-[#6B7280]">{request.student?.rollNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-[#6B7280]" />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280] mb-0.5">Date & Range</p>
                <p className="text-[14px] font-medium text-[#111111]">
                  {formatDate(request.date)}
                  {request.endDate && request.endDate !== request.date && (
                    <span> — {formatDate(request.endDate)}</span>
                  )}
                </p>
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

            {request.submittedAt && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                  <Clock size={15} />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Submitted On</p>
                  <p className="text-[13px] font-bold text-slate-900 font-mono">
                    {formatSubmittedAt(request.submittedAt)}
                  </p>
                </div>
              </div>
            )}

            {Boolean(request.documentName || request.documentUrl) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Proof Document</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 truncate max-w-[150px]">
                      {request.documentName || 'Proof Document'}
                    </span>
                    <button
                      type="button"
                      title="Preview Proof"
                      onClick={() => setIsPreviewOpen(true)}
                      className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={request.documentUrl || (request.documentName?.startsWith('http') ? request.documentName : undefined)}
                      download={request.documentName || 'proof_document'}
                      title="Download Proof"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const targetUrl = request.documentUrl || (request.documentName?.startsWith('http') ? request.documentName : null);
                        if (!targetUrl) {
                          e.preventDefault();
                          setIsPreviewOpen(true);
                        }
                      }}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Download size={14} />
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

        {/* Timeline */}
        <div className="card p-5 mb-8">
          <p className="text-[13px] font-medium text-[#6B7280] mb-4">Approval Timeline</p>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                      step.done ? 'bg-[#111111]' : 'bg-[#E5E7EB]'
                    }`}
                  />
                  {!step.isLast && (
                    <div
                      className={`w-0.5 h-8 ${step.done ? 'bg-[#E5E7EB]' : 'bg-[#F3F4F6]'}`}
                    />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-[14px] font-medium ${
                      step.done ? 'text-[#111111]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round Icon Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-2 mt-6 pt-2">
          <div className="flex items-center justify-center gap-4">
            <WhatsAppShareButton
              request={request}
              variant="round"
              className="w-13 h-13 shadow-md shadow-[#25D366]/30"
            />

            {request.status === 'pending' && (
              <>
                <button
                  type="button"
                  title="Edit Request"
                  onClick={() => setIsEditOpen(true)}
                  className="w-13 h-13 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer border-none"
                >
                  <Pencil size={20} />
                </button>
                <button
                  type="button"
                  title="Cancel Request"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to cancel and delete this request?')) {
                      try {
                        await api.deleteRequest(request.id);
                        navigate('/student/history');
                      } catch (err) {
                        alert('Failed to delete request.');
                      }
                    }
                  }}
                  className="w-13 h-13 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}

            <button
              type="button"
              title="Back to History"
              onClick={() => navigate('/student/history')}
              className="w-13 h-13 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>

        {/* Inline Edit Request Modal Overlay */}
        <EditRequestModal
          request={request}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      </div>
    </PageWrapper>
  );
}
