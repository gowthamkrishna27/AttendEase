import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock,
  Eye, Download, ArrowRight, ShieldCheck,
  KeyRound, Sparkles, Copy, Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatSubmittedAt } from '../lib/utils';
import { ProofPreviewModal } from '../components/shared/ProofPreviewModal';
import { WhatsAppIcon } from '../components/shared/WhatsAppShareButton';
import NotFound from './NotFound';

export default function ShareRedirectPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPin, setFacultyPin] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch smart share pass data
  const {
    data: shareData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['share-pass', publicId],
    queryFn: () => api.getSharePassView(publicId!),
    enabled: !!publicId,
    staleTime: 10 * 1000,
  });

  const request = shareData?.request;
  const authInfo = shareData?.authInfo;

  // Check if current viewer is authorized faculty or HOD
  const isFacultyOrHOD = user?.role === 'faculty' || user?.role === 'hod' || user?.role === 'admin';
  const canDirectReview = Boolean(authInfo?.canReview || (isFacultyOrHOD && request?.status === 'pending'));

  // Quick Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      action,
      reason,
      pin,
      email,
    }: {
      action: 'approve' | 'reject';
      reason?: string;
      pin?: string;
      email?: string;
    }) => {
      return api.quickReviewSharePass(publicId!, action, {
        rejectionReason: reason,
        facultyPin: pin,
        facultyEmail: email,
      });
    },
    onSuccess: (data) => {
      showToast(data.message || 'Request updated successfully!');
      setRejectModalOpen(false);
      setPinModalOpen(false);
      setRejectionReason('');
      setFacultyPin('');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Action failed. Please try again.', true);
    },
  });

  const handleAction = (action: 'approve' | 'reject') => {
    if (canDirectReview) {
      if (action === 'reject') {
        setRejectModalOpen(true);
      } else {
        reviewMutation.mutate({ action: 'approve' });
      }
      return;
    }

    // If guest / not logged in on this browser, open Quick Faculty PIN authorization
    setPendingAction(action);
    setPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyEmail || !facultyPin) {
      showToast('Please enter your Faculty Email and 4-Digit PIN', true);
      return;
    }
    if (!pendingAction) return;

    reviewMutation.mutate({
      action: pendingAction,
      reason: rejectionReason,
      pin: facultyPin,
      email: facultyEmail,
    });
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast('Share link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsAppForward = () => {
    if (!request) return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/share/${request.publicId || request.id}`;
    const studentName = request.student?.name || 'Student';
    const rollNo = request.student?.rollNumber || request.studentId || 'N/A';
    const reason = request.reasonLabel || request.reason;
    const statusText = request.status.toUpperCase();

    const message = `Attendance Permission Pass\n\nStudent: ${studentName} (${rollNo})\nReason: ${reason}\nStatus: ${statusText}\n\nLive Pass Link:\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-center mb-4 text-orange-500 animate-pulse">
          <Sparkles size={24} />
        </div>
        <p className="text-sm font-bold text-slate-800">Verifying Smart Permission Pass...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to SRKR Live Records</p>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <NotFound
        code="404"
        title="Permission Pass Not Found"
      />
    );
  }

  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isPending = request.status === 'pending';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center font-sans antialiased">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${
              toastMsg.isError
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/30'
                : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/40'
            }`}
          >
            {toastMsg.isError ? <XCircle size={15} /> : <CheckCircle2 size={15} className="text-emerald-400" />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg space-y-4">

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 text-center relative overflow-hidden">
          {/* Subtle Orange Gradient Glow */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
          
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/70 flex items-center justify-center font-black text-xs shrink-0">
                AE
              </div>
              <div>
                <p className="text-[12px] font-extrabold text-slate-900 leading-tight">SRKR ENGINEERING COLLEGE</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AttendEase Official Pass</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy Link"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={handleWhatsAppForward}
                title="Forward on WhatsApp"
                className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-sm transition-all cursor-pointer"
              >
                <WhatsAppIcon size={16} />
              </button>
            </div>
          </div>

          {/* Status Badge & Pass Code */}
          <div className="pt-4 flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs border ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isRejected
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }">
              {isApproved && <CheckCircle2 size={14} className="text-emerald-600" />}
              {isRejected && <XCircle size={14} className="text-rose-600" />}
              {isPending && <Clock size={14} className="text-amber-600" />}
              <span>
                {isApproved
                  ? 'Official Permission Approved'
                  : isRejected
                  ? 'Permission Request Rejected'
                  : 'Pending Faculty Review'}
              </span>
            </div>

            <p className="text-[11px] font-mono text-slate-400">
              Pass ID: <span className="font-bold text-slate-700">{request.publicId || request.id}</span>
            </p>
          </div>
        </div>

        {/* Student Profile & Request Details Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
          
          {/* Student Profile Row */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-14 h-16 rounded-2xl border-2 border-orange-500 overflow-hidden shadow-sm bg-slate-100 shrink-0">
              <img
                src={request.student?.avatarUrl}
                alt={request.student?.name || 'Student'}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(request.student?.name || request.student?.rollNumber || 'S')}&background=F97316&color=fff&size=128`;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-slate-900 truncate">
                {request.student?.name}
              </h2>
              <p className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                {request.student?.rollNumber}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {request.student?.year ? `${request.student.year} • ` : ''}{request.student?.department || 'CSIT'}
              </p>
            </div>
          </div>

          {/* Key Permission Parameters */}
          <div className="grid grid-cols-2 gap-3 text-left text-xs">
            
            {/* Reason */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Reason
              </span>
              <span className="font-extrabold text-slate-900">
                {request.reasonLabel || request.reason}
              </span>
            </div>

            {/* Date */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Date / Duration
              </span>
              <span className="font-extrabold text-slate-900 truncate block">
                {formatDate(request.date)}
                {request.endDate && request.endDate !== request.date && (
                  <span className="block text-[10px] text-slate-500 font-normal">
                    to {formatDate(request.endDate)}
                  </span>
                )}
              </span>
            </div>

            {/* Time / Periods */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Time & Periods
              </span>
              <span className="font-bold text-slate-900 block">
                {formatTime(request.startTime)} – {formatTime(request.endTime)}
              </span>
              {request.periods && (
                <span className="text-[10px] font-bold text-orange-600 block mt-0.5">
                  Periods: {request.periods}
                </span>
              )}
            </div>

            {/* Assigned Faculty */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned Faculty
              </span>
              <span className="font-bold text-slate-900 truncate block">
                {request.faculty?.name || (request.faculties && request.faculties.length > 0 ? request.faculties[0].name : 'Department Faculty')}
              </span>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Student Explanation
              </span>
              <p className="text-[12.5px] text-slate-700 leading-relaxed italic">
                "{request.description}"
              </p>
            </div>
          )}

          {/* Review Decision Stamp (if approved/rejected) */}
          {request.status !== 'pending' && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
              isApproved ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  {isApproved ? 'Approved By' : 'Rejected By'}
                </span>
                <span className="font-extrabold text-sm block mt-0.5">
                  {request.finalDecisionName || (request.finalDecisionBy === 'HOD' ? 'Head of Department (HOD)' : request.faculty?.name || 'Faculty')}
                </span>
                {request.reviewedAt && (
                  <span className="text-[10px] opacity-70 block">
                    {formatSubmittedAt(request.reviewedAt)}
                  </span>
                )}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isApproved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {isApproved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {isRejected && request.rejectionReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs">
              <span className="font-bold text-rose-700 block mb-0.5">Remarks:</span>
              <p className="text-rose-900">{request.rejectionReason}</p>
            </div>
          )}

          {/* Proof Document (if attached) */}
          {Boolean(request.documentName || request.documentUrl) && (
            <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                  Proof Document
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {request.documentName || 'Proof_Document'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  title="Preview Document"
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                >
                  <Eye size={14} />
                </button>
                <a
                  href={request.documentUrl || (request.documentName?.startsWith('http') ? request.documentName : undefined)}
                  download={request.documentName || 'proof_document'}
                  title="Download File"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-orange-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Smart Action Bar ── */}
        <div className="space-y-3">
          
          {/* Quick Review Buttons for Faculty / HOD (when request is still pending) */}
          {isPending && (
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAction('approve')}
                disabled={reviewMutation.isPending}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[13.5px] flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer border-none"
              >
                <CheckCircle2 size={17} />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('reject')}
                disabled={reviewMutation.isPending}
                className="flex-1 h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <XCircle size={17} />
                <span>Reject</span>
              </button>
            </div>
          )}

          {/* Portal Navigation Button */}
          {user ? (
            <button
              type="button"
              onClick={() => {
                if (user.role === 'faculty') navigate(`/faculty/review/${request.publicId || request.id}`);
                else if (user.role === 'hod') navigate(`/hod/review/${request.publicId || request.id}`);
                else navigate(`/student/request/${request.publicId || request.id}`);
              }}
              className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Open in AttendEase Portal</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-11 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[12.5px] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Sign In to Portal</span>
              <ArrowRight size={14} />
            </button>
          )}

          {/* Verification Footnote */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 pt-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Cryptographically Verified Pass • SRKR CSE(DS) & CSIT</span>
          </div>
        </div>

      </div>

      {/* Proof Preview Modal */}
      <ProofPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentUrl={request.documentUrl}
        documentName={request.documentName}
      />

      {/* Faculty Quick PIN Modal (for fast reviews on mobile/guest) */}
      <AnimatePresence>
        {pinModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Faculty Fast Review</h3>
                    <p className="text-xs text-slate-400">Verify using your Faculty PIN</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Faculty Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="faculty@srkrec.ac.in"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    4-Digit Faculty PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={facultyPin}
                    onChange={(e) => setFacultyPin(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {pendingAction === 'reject' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Reason for Rejection
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional feedback..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none resize-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={`w-full h-11 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                    pendingAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  }`}
                >
                  {reviewMutation.isPending
                    ? 'Processing...'
                    : `Confirm ${pendingAction === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal with Reason */}
      <AnimatePresence>
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">Reject Permission</h3>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-rose-500 focus:bg-white resize-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ action: 'reject', reason: rejectionReason })}
                    className="flex-[2] h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 cursor-pointer"
                  >
                    {reviewMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
