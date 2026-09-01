import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  User,
  Eye,
  Pencil,
  Trash2,
  Download,
  CheckCircle2,
  Check,
  X,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { WhatsAppShareButton } from '../../components/shared/WhatsAppShareButton';
import { Button } from '../../components/ui/Button';
import { ProofPreviewModal } from '../../components/shared/ProofPreviewModal';
import { EditRequestModal } from '../../components/shared/EditRequestModal';
import * as api from '../../lib/api';
import { formatDate, formatTime, formatSubmittedAt } from '../../lib/utils';

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
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8', fontSize: 14 }}>
          Loading request details...
        </div>
      </PageWrapper>
    );
  }

  if (isError || !request) {
    return (
      <PageWrapper role="student">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-slate-500">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/student/history')}>
            Back to History
          </Button>
        </div>
      </PageWrapper>
    );
  }

  // ── 1. Approved timestamp derivation ──
  function getApprovedAtTimestamp(req: api.AttendanceRequest): string | null {
    if (req.status !== 'approved') return null;

    if (req.actions?.length) {
      const approvalAction = [...req.actions]
        .reverse()
        .find(
          action =>
            action.action &&
            action.action.toLowerCase().includes('approved')
        );

      if (approvalAction?.performedAt) {
        const pAt: unknown = approvalAction.performedAt;
        return pAt instanceof Date ? pAt.toISOString() : String(pAt);
      }
    }

    return req.reviewedAt || null;
  }

  const approvedAt = getApprovedAtTimestamp(request);

  // ── 2. Decision Maker derivation from actual audit actions ──
  interface DecisionMakerInfo {
    name: string;
    role?: string;
  }

  function getDecisionMaker(req: api.AttendanceRequest): DecisionMakerInfo | null {
    if (req.status === 'pending') {
      return null;
    }

    // A. Check latest decision action from request.actions
    if (req.actions && req.actions.length > 0) {
      const decisionAction = [...req.actions].reverse().find(act => {
        const actLower = (act.action || '').toLowerCase();
        return (
          actLower.includes('approved') ||
          actLower.includes('rejected') ||
          actLower.includes('granted') ||
          actLower.includes('review')
        );
      });

      if (decisionAction?.performedBy?.name && decisionAction.performedBy.name !== 'User') {
        let role = decisionAction.performedBy.role;
        if (!role) {
          if (decisionAction.action.toLowerCase().includes('hod')) role = 'HOD';
          else if (decisionAction.action.toLowerCase().includes('faculty')) role = 'Faculty';
          else if (decisionAction.action.toLowerCase().includes('admin')) role = 'Admin';
        }
        return {
          name: decisionAction.performedBy.name,
          role: role
            ? role.toLowerCase() === 'hod'
              ? 'HOD'
              : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
            : req.finalDecisionBy || 'Faculty',
        };
      }
    }

    // B. Fallback to finalDecisionName and finalDecisionBy
    if (req.finalDecisionName) {
      return {
        name: req.finalDecisionName,
        role: req.finalDecisionBy || 'Faculty',
      };
    }

    return null;
  }

  const decisionMaker = getDecisionMaker(request);

  // ── 3. Reviewer and Approver info for the Stepper ──
  const reviewerInfo = (() => {
    if (request.status === 'pending') return null;
    if (decisionMaker) return decisionMaker;
    if (request.actions?.length) {
      const rev = request.actions.find(a => a.action?.toLowerCase().includes('review'));
      if (rev?.performedBy?.name && rev.performedBy.name !== 'User') {
        return { name: rev.performedBy.name, role: rev.performedBy.role || 'Faculty' };
      }
    }
    return null;
  })();

  const approverInfo = decisionMaker;

  // Derive review action timestamp
  const reviewTimestamp = (() => {
    if (request.status === 'pending') return null;
    if (request.actions?.length) {
      const revAct = request.actions.find(a => {
        const lower = (a.action || '').toLowerCase();
        return lower.includes('review') || lower.includes('approved') || lower.includes('rejected');
      });
      if (revAct?.performedAt) return String(revAct.performedAt);
    }
    return request.reviewedAt || approvedAt;
  })();

  // Review stage label
  const isHodAction =
    request.finalDecisionBy === 'HOD' ||
    Boolean(request.actions?.some(a => (a.action || '').toLowerCase().includes('hod')));
  const reviewStageLabel = isHodAction ? 'HOD Review' : 'Faculty Review';

  // ── 4. Assigned faculty display ──
  const assignedFacultyDisplay = (() => {
    if (request.faculties && request.faculties.length > 0) {
      const names = Array.from(new Set(request.faculties.map(f => f.name).filter(Boolean)));
      if (names.length > 0) return names.join(', ');
    }
    return request.faculty?.name || '—';
  })();

  return (
    <PageWrapper role="student">
      <div className="max-w-[700px] mx-auto py-2 px-1 sm:px-4">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/student/history')}
          className="flex items-center gap-2 text-[14px] text-slate-600 hover:text-slate-900 font-medium transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to History
        </button>

        {/* Request Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
              {request.reasonLabel}
            </h1>
            <p className="text-[14px] text-slate-500 font-normal mt-1.5 truncate">
              Submitted to {assignedFacultyDisplay}
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <StatusBadge
              status={request.status}
              finalDecisionBy={request.finalDecisionBy}
              finalDecisionName={request.finalDecisionName}
            />
          </div>
        </div>

        {/* Card 1: Request Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 sm:p-7 mb-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            {/* Student */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">Student</p>
                <p className="text-[14px] font-bold text-slate-900 uppercase mt-0.5 leading-snug">
                  {request.student?.name || '—'}
                </p>
                <p className="text-[12px] font-medium text-slate-500 font-mono mt-0.5">
                  {request.student?.rollNumber || request.studentId}
                </p>
              </div>
            </div>

            {/* Date & Range */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">Date & Range</p>
                <p className="text-[14px] font-bold text-slate-900 mt-0.5 leading-snug">
                  {formatDate(request.date)}
                  {request.endDate && request.endDate !== request.date && (
                    <span> — {formatDate(request.endDate)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Time & Periods */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">Time & Periods</p>
                <p className="text-[14px] font-bold text-slate-900 mt-0.5 leading-snug">
                  {formatTime(request.startTime)} – {formatTime(request.endTime)}
                </p>
                {request.periods && (
                  <p className="text-[12px] font-semibold text-orange-600 mt-0.5">
                    Periods: {request.periods}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Subtle Divider */}
          <div className="border-t border-slate-100 my-6" />

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            {/* Submitted On */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">Submitted On</p>
                <p className="text-[14px] font-bold text-slate-900 mt-0.5 leading-snug">
                  {formatSubmittedAt(request.submittedAt)}
                </p>
              </div>
            </div>

            {/* Approved On / Reviewed On / Status */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">
                  {request.status === 'approved'
                    ? 'Approved On'
                    : request.status === 'rejected'
                    ? 'Rejected On'
                    : 'Status'}
                </p>
                <p className="text-[14px] font-bold text-slate-900 mt-0.5 leading-snug">
                  {approvedAt
                    ? formatSubmittedAt(approvedAt)
                    : request.status === 'pending'
                    ? 'Pending Review'
                    : request.reviewedAt
                    ? formatSubmittedAt(request.reviewedAt)
                    : '—'}
                </p>
              </div>
            </div>

            {/* Decision Maker */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-400">Decision Maker</p>
                <p className="text-[14px] font-bold text-slate-900 mt-0.5 leading-snug truncate">
                  {decisionMaker
                    ? decisionMaker.name
                    : request.status === 'pending'
                    ? 'Pending'
                    : 'Not available'}
                </p>
                {decisionMaker?.role && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-md">
                    {decisionMaker.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Description */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 sm:p-6 mb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-slate-400 mb-1">Description</p>
              <p className="text-[14px] text-slate-800 leading-relaxed">
                {request.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>

        {/* Proof Document (if provided) */}
        {Boolean(request.documentName || request.documentUrl) && (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 sm:p-6 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-400 mb-0.5">Proof Document</p>
                  <p className="text-[14px] font-bold text-slate-900 truncate">
                    {request.documentName || 'Proof Document'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Preview Proof"
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-9 h-9 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Eye size={16} />
                </button>
                <a
                  href={
                    request.documentUrl ||
                    (request.documentName?.startsWith('http') ? request.documentName : undefined)
                  }
                  download={request.documentName || 'proof_document'}
                  title="Download Proof"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => {
                    const targetUrl =
                      request.documentUrl ||
                      (request.documentName?.startsWith('http') ? request.documentName : null);
                    if (!targetUrl) {
                      e.preventDefault();
                      setIsPreviewOpen(true);
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason (if rejected) */}
        {request.status === 'rejected' && request.rejectionReason && (
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-5 sm:p-6 mb-4 text-rose-900">
            <p className="text-[12px] font-semibold text-rose-600 uppercase tracking-wider mb-1">
              Rejection Reason
            </p>
            <p className="text-[14px] text-rose-950 leading-relaxed">{request.rejectionReason}</p>
          </div>
        )}

        {/* Card 3: Approval Timeline (Horizontal Stepper) */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 sm:p-8 mb-6">
          <h2 className="text-[16px] font-bold text-slate-900 mb-8">Approval Timeline</h2>

          <div className="relative">
            {/* Stepper Grid */}
            <div className="grid grid-cols-3 gap-0 relative">
              {/* Step 1: Submitted */}
              <div className="flex flex-col items-center text-center relative z-10 px-1">
                <div className="w-12 h-12 rounded-full border-2 border-orange-500 bg-white flex items-center justify-center text-orange-500 shadow-sm">
                  <FileText size={20} />
                </div>
                <p className="text-[13px] font-bold text-slate-900 mt-3.5">Submitted</p>
                <p className="text-[12px] text-slate-400 font-mono mt-0.5">
                  {formatSubmittedAt(request.submittedAt)}
                </p>
              </div>

              {/* Step 2: Review */}
              <div className="flex flex-col items-center text-center relative z-10 px-1">
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm ${
                    request.status !== 'pending'
                      ? 'border-orange-500 bg-white text-orange-500'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <User size={20} />
                </div>
                <p className="text-[13px] font-bold text-slate-900 mt-3.5">{reviewStageLabel}</p>
                <p className="text-[12px] text-slate-400 font-mono mt-0.5">
                  {reviewTimestamp ? formatSubmittedAt(reviewTimestamp) : 'Awaiting Review'}
                </p>
                {reviewerInfo && (
                  <div className="mt-2.5 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 font-medium">Reviewed by</span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-center">
                      <span className="text-[12px] font-bold text-slate-800">{reviewerInfo.name}</span>
                      {reviewerInfo.role && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded">
                          {reviewerInfo.role}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Final Decision */}
              <div className="flex flex-col items-center text-center relative z-10 px-1">
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm ${
                    request.status === 'approved'
                      ? 'border-orange-500 bg-white text-orange-500'
                      : request.status === 'rejected'
                      ? 'border-rose-500 bg-white text-rose-500'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {request.status === 'rejected' ? (
                    <X size={20} strokeWidth={2.5} />
                  ) : (
                    <Check size={20} strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-[13px] font-bold text-slate-900 mt-3.5">
                  {request.status === 'rejected' ? 'Rejected' : 'Approved'}
                </p>
                <p className="text-[12px] text-slate-400 font-mono mt-0.5">
                  {approvedAt
                    ? formatSubmittedAt(approvedAt)
                    : request.status === 'rejected' && request.reviewedAt
                    ? formatSubmittedAt(request.reviewedAt)
                    : 'Pending'}
                </p>
                {request.status !== 'pending' && approverInfo && (
                  <div className="mt-2.5 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {request.status === 'rejected' ? 'Rejected by' : 'Approved by'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-center">
                      <span className="text-[12px] font-bold text-slate-800">{approverInfo.name}</span>
                      {approverInfo.role && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded">
                          {approverInfo.role}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Connecting Lines Behind Circles */}
              {/* Connector 1: Step 1 to Step 2 */}
              <div
                className="absolute top-6 left-[16.66%] right-[50%] h-0.5 -translate-y-1/2 z-0"
                style={{ background: '#F97316' }}
              />

              {/* Connector 2: Step 2 to Step 3 */}
              <div
                className={`absolute top-6 left-[50%] right-[16.66%] -translate-y-1/2 z-0 ${
                  request.status !== 'pending'
                    ? 'h-0.5 bg-orange-500'
                    : 'border-t-2 border-dashed border-slate-200 h-0'
                }`}
                style={request.status !== 'pending' ? { background: '#F97316' } : {}}
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions & Floating Controls */}
        <div className="flex flex-col items-center justify-center gap-2 mt-8 pt-2">
          <div className="flex items-center justify-center gap-4">
            <WhatsAppShareButton
              request={request}
              variant="round"
              className="w-12 h-12 sm:w-13 sm:h-13 shadow-md shadow-orange-500/20 bg-orange-500 hover:bg-orange-600 text-white"
            />

            {request.status !== 'approved' && (
              <>
                <button
                  type="button"
                  title="Edit Request"
                  onClick={() => setIsEditOpen(true)}
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer border-none"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  title="Cancel Request"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to cancel and delete this request?')) {
                      try {
                        await api.deleteRequest(request.id);
                        navigate('/student/history');
                      } catch {
                        alert('Failed to delete request.');
                      }
                    }
                  }}
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}

            <button
              type="button"
              title="Back to History"
              onClick={() => navigate('/student/history')}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200/80 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        {/* Modals */}
        <ProofPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentUrl={request.documentUrl}
          documentName={request.documentName}
        />

        <EditRequestModal
          request={request}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      </div>
    </PageWrapper>
  );
}
