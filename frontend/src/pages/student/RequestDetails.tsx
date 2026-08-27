import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, User } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ShareRequestButton } from '../../components/shared/ShareRequestButton';
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
    staleTime: 0,
    gcTime: 0,
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
          <StatusBadge status={request.status} finalDecisionBy={request.finalDecisionBy} finalDecisionName={request.finalDecisionName} />
        </div>

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

        {/* Quick WhatsApp Share Card */}
        <div className="card p-4 mb-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-2xs">
          <div>
            <p className="text-[14px] font-bold text-emerald-950 flex items-center gap-1.5">
              📲 Share Request Link
            </p>
            <p className="text-[12px] text-emerald-700 mt-0.5">
              Send request details & link directly via WhatsApp or copy link.
            </p>
          </div>
          <ShareRequestButton request={request} size="md" />
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          {request.status === 'pending' && (
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
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
            >
              Cancel / Delete Request
            </Button>
          )}
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => navigate('/student/history')}>
            Back to History
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
