import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { formatDate, formatTime } from '../../lib/utils';

import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';

export default function HODRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequest(id!),
    enabled: Boolean(id),
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

        {/* Student info */}
        <div className="card p-5 mb-4">
          <p className="text-[13px] font-medium text-[#6B7280] mb-3">Student</p>
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

        {/* Faculty info */}
        <div className="card p-5 mb-4">
          <p className="text-[13px] font-medium text-[#6B7280] mb-3">Assigned Faculty</p>
          <div className="flex items-center gap-4">
            <Avatar name={request.faculty?.name || 'F'} size="sm" />
            <div>
              <p className="text-[14px] font-semibold text-[#111111]">{request.faculty?.name}</p>
              <p className="text-[13px] text-[#6B7280]">
                {request.faculty?.department} · {request.faculty?.email}
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

        {/* HOD note - read only */}
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-5 py-4 mb-6">
          <p className="text-[13px] font-medium text-[#6B7280]">
            HOD View — Read Only
          </p>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            Approval/rejection is handled by the assigned faculty member.
          </p>
        </div>

        <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/hod')}>
          Back to Overview
        </Button>
      </div>
    </PageWrapper>
  );
}
