import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, User } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111111] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back
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
          <StatusBadge status={request.status} />
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
                <p className="text-[13px] text-[#6B7280] mb-0.5">Date</p>
                <p className="text-[14px] font-medium text-[#111111]">
                  {formatDate(request.date)}
                </p>
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
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280] mb-0.5">Document</p>
                  <p className="text-[14px] font-medium text-[#111111] truncate max-w-[160px]">
                    {request.documentName}
                  </p>
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

        <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/student/history')}>
          Back to History
        </Button>
      </div>
    </PageWrapper>
  );
}
