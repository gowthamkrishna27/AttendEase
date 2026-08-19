import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Calendar, Clock, CheckCircle2, User, Building2, X } from 'lucide-react';
import type { AttendanceRequest } from '../../types';
import { formatTime } from '../../lib/utils';
import logo from '../../assets/logo.png';

export interface ExtendedAttendanceRequest extends AttendanceRequest {
  sectionName?: string;
}

interface PermissionSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: AttendanceRequest | ExtendedAttendanceRequest | null;
}

export const getStudentPhoto = (pass: { student?: { avatarUrl?: string; rollNumber?: string; department?: string; name?: string }; studentId?: string }): string => {
  if (pass.student?.avatarUrl && (pass.student.avatarUrl.startsWith('http') || pass.student.avatarUrl.startsWith('data:'))) {
    return pass.student.avatarUrl;
  }
  const raw = (pass.student?.rollNumber || pass.studentId || '').trim().toUpperCase();
  if (!raw || raw.startsWith('STU-') || raw.startsWith('FAC-') || raw.startsWith('ADMIN-')) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(pass.student?.name || 'Student')}&background=0F172A&color=fff`;
  }
  if (raw.length >= 8 && /^[0-9]{2}[A-Z0-9]+$/i.test(raw)) {
    return `https://srkrexams.in/SRKR/photo/${raw}.jpg`;
  }
  const isLE = /^LE\d+$/i.test(raw);
  const dept = (pass.student?.department || '').includes('CSD') ? '62' : '07';
  if (isLE) {
    const num = raw.replace(/LE/i, '').padStart(2, '0');
    return `https://srkrexams.in/SRKR/photo/25B95A${dept}${num}.jpg`;
  }
  const clean = raw.padStart(2, '0');
  return `https://srkrexams.in/SRKR/photo/24B91A${dept}${clean}.jpg`;
};

export const PermissionSlipModal: React.FC<PermissionSlipModalProps> = ({
  isOpen,
  onClose,
  pass,
}) => {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!isOpen || !pass) return null;

  const studentName = pass.student?.name ?? pass.studentId ?? 'Student';
  const rollNumber = (pass.student?.rollNumber ?? pass.studentId ?? '').toUpperCase();
  const department = pass.student?.department ?? 'CSIT';
  const section = pass.student?.section ?? (pass as ExtendedAttendanceRequest).sectionName ?? 'A';
  const avatarUrl = getStudentPhoto(pass);
  const refId = pass.id ? pass.id.toUpperCase().slice(-8) : 'PERM-001';
  const approver = pass.finalDecisionName || pass.faculty?.name || 'Faculty Advisor';

  const modalContent = (
    <AnimatePresence>
      <div className="attendease-slip-portal fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <style>{`
          @media screen {
            .attendease-printable-slip {
              display: none !important;
            }
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            body > * {
              visibility: hidden !important;
            }
            .attendease-slip-portal,
            .attendease-slip-portal * {
              visibility: visible !important;
            }
            .attendease-slip-portal {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              z-index: 9999999 !important;
            }
            .attendease-printable-slip {
              display: flex !important;
              visibility: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              min-height: 255mm !important;
              padding: 6mm 8mm !important;
              box-sizing: border-box !important;
            }
            .attendease-screen-modal {
              display: none !important;
            }
          }
        `}</style>
        {/* ── On-Screen Mobile & Desktop Glass Slip Modal ── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 247, 237, 0.95) 100%)',
            backdropFilter: 'blur(24px) saturate(190%)',
            WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(254, 215, 170, 0.85)',
            boxShadow: '0 24px 60px -12px rgba(249, 115, 22, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
          }}
          className="attendease-screen-modal rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4.5 sm:p-6 max-h-[88vh] sm:max-h-[92vh] flex flex-col justify-between overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-orange-500/20 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-orange-600 font-extrabold text-[10px] uppercase tracking-wider">
                  <Building2 size={12} className="shrink-0" />
                  <span>SRKR Engineering College</span>
                </div>
                <h2 className="text-[18px] sm:text-[20px] font-black text-slate-900 uppercase leading-tight mt-0.5 tracking-tight">
                  Permission Slip
                </h2>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span
                    style={{
                      background: 'rgba(249, 115, 22, 0.14)',
                      border: '1px solid rgba(249, 115, 22, 0.35)',
                      color: '#EA580C',
                    }}
                    className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <CheckCircle2 size={11} />
                    APPROVED
                  </span>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(254, 215, 170, 0.8)',
                      color: '#C2410C',
                    }}
                    className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                  >
                    #{refId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close slip"
                style={{
                  background: 'rgba(255, 247, 237, 0.95)',
                  border: '1px solid rgba(254, 215, 170, 0.9)',
                  color: '#EA580C',
                }}
                className="w-8 h-8 rounded-full hover:bg-orange-600 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm font-bold shrink-0 shadow-xs active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Student Details Glass Card */}
            <div className="py-3 space-y-2.5 text-[12px]">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(254, 215, 170, 0.75)',
                  boxShadow: '0 4px 16px rgba(249, 115, 22, 0.06)',
                }}
                className="flex items-center gap-3 p-3 rounded-2xl"
              >
                <div className="w-13 h-15 sm:w-14 sm:h-16 rounded-xl border-2 border-orange-300 overflow-hidden bg-slate-100 shrink-0 shadow-xs relative">
                  <img
                    src={avatarUrl}
                    alt={studentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        studentName
                      )}&background=EA580C&color=fff&size=128`;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] text-orange-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <User size={10} />
                    Student Details
                  </p>
                  <p className="font-extrabold text-slate-900 text-[13.5px] sm:text-[14px] truncate leading-tight">
                    {studentName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="font-mono font-black text-slate-900 text-[12px] bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                      {rollNumber}
                    </span>
                    <span
                      style={{
                        background: 'rgba(249, 115, 22, 0.12)',
                        border: '1px solid rgba(249, 115, 22, 0.28)',
                        color: '#EA580C',
                      }}
                      className="px-1.5 py-0.5 rounded-md font-bold text-[9.5px]"
                    >
                      {department} - {section}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(254, 215, 170, 0.65)',
                }}
                className="space-y-2 p-3 rounded-2xl text-[11.5px] sm:text-[12px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold">Category / Reason:</span>
                  <span
                    style={{
                      background: 'rgba(249, 115, 22, 0.15)',
                      border: '1px solid rgba(249, 115, 22, 0.35)',
                      color: '#C2410C',
                    }}
                    className="font-extrabold px-2 py-0.5 rounded-lg text-[11px] text-right"
                  >
                    {pass.reasonLabel || pass.reason}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Calendar size={11} className="text-orange-500" />
                    Date:
                  </span>
                  <span className="font-bold text-slate-800">{pass.date}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Clock size={11} className="text-orange-500" />
                    Time Slot:
                  </span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">
                    {formatTime(pass.startTime)} – {formatTime(pass.endTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold">Approved By:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[190px] text-right text-[11.5px]">
                    {approver}
                  </span>
                </div>
              </div>

              {/* Purpose / Description */}
              {pass.description && (
                <div
                  style={{
                    background: 'rgba(255, 247, 237, 0.90)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(254, 215, 170, 0.8)',
                  }}
                  className="p-3 rounded-2xl text-[11px] sm:text-[11.5px] text-orange-950 leading-relaxed"
                >
                  <span className="font-bold text-orange-800 block mb-0.5 text-[9.5px] uppercase tracking-wider">
                    Purpose / Description:
                  </span>
                  "{pass.description}"
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2.5 flex flex-col sm:flex-row items-center gap-2 border-t border-orange-500/15">
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 1) 100%)',
                boxShadow: '0 8px 20px -4px rgba(249, 115, 22, 0.45)',
              }}
              className="w-full sm:flex-1 h-11 text-white font-extrabold text-[12.5px] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
            >
              <Printer size={15} />
              <span>Print Official Slip / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 247, 237, 0.9)',
                border: '1px solid rgba(254, 215, 170, 0.85)',
                color: '#EA580C',
              }}
              className="w-full sm:w-auto h-11 px-5 font-extrabold text-[12px] rounded-xl cursor-pointer transition-colors shadow-xs hover:bg-orange-100"
            >
              Close
            </button>
          </div>
        </motion.div>

        {/* ── Printable Letterhead Document (Visible only when printing) ── */}
        <div
          className="attendease-printable-slip bg-white p-6 sm:p-8 text-slate-900 font-sans leading-relaxed w-full min-h-[255mm] flex flex-col justify-between mx-auto text-[12px]"
        >
          <div>
            {/* College Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                SAGI RAMAKRISHNAM RAJU ENGINEERING COLLEGE (AUTONOMOUS)
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                CHINA AMIRAM, BHIMAVARAM — 534 204, W.G. Dist., Andhra Pradesh, India
              </p>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                Official Student Permission Slip
              </p>
            </div>

            {/* Top Grid: From / Reference / Student Photo */}
            <div className="grid grid-cols-12 items-start text-[12px] font-medium mb-4 gap-2 border-b border-slate-200/80 pb-3">
              <div className="col-span-5 space-y-0.5">
                <p className="font-bold text-slate-900 uppercase text-[11px]">From:</p>
                <p className="font-bold text-slate-900">{studentName}</p>
                <p className="font-mono text-slate-700 font-bold">Roll No: {rollNumber}</p>
                <p className="text-slate-600 text-[11.5px]">Department of {department} (Section {section})</p>
                <p className="text-slate-600 text-[11.5px]">SRKR Engineering College (Autonomous)</p>
              </div>

              <div className="col-span-4 text-center space-y-1 self-center">
                <div className="inline-block px-3 py-1 bg-slate-50 border border-slate-300 rounded-md">
                  <p className="font-bold text-slate-900 text-[11.5px]">Date: {pass.date}</p>
                  <p className="font-mono text-slate-600 text-[10.5px]">Ref: SRKR/PERM/{refId}</p>
                </div>
              </div>

              <div className="col-span-3 flex flex-col items-end">
                <div className="w-[88px] h-[88px] border-2 border-slate-900 rounded-md bg-white overflow-hidden flex flex-col items-center justify-center relative shadow-xs">
                  <img
                    src={avatarUrl}
                    alt="Student Photo"
                    className="w-full h-full object-cover block"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        studentName
                      )}&background=0F172A&color=fff`;
                    }}
                  />
                </div>
                <div className="text-center w-[88px] mt-1 space-y-0.5">
                  <p className="font-bold text-[10px] text-slate-900 leading-tight truncate">
                    {studentName}
                  </p>
                  <p className="font-mono font-black text-[9.5px] text-slate-800 uppercase tracking-tight">
                    {rollNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* To Header */}
            <div className="text-[12px] font-medium mb-4 space-y-0.5">
              <p className="font-bold text-slate-900 uppercase text-[11px]">To:</p>
              <p className="font-bold text-slate-900">The Head of the Department (HOD)</p>
              <p className="text-slate-700">Department of {department} &amp; CSIT</p>
              <p className="text-slate-700">SRKR Engineering College (Autonomous), Bhimavaram</p>
            </div>

            {/* Subject */}
            <div className="my-4 p-3 bg-slate-50 border-y border-slate-300 font-bold text-[12px] sm:text-[13px] text-slate-900 leading-snug">
              Subject: Application requesting official permission for {pass.reasonLabel || pass.reason} — "{pass.description || 'Academic Permission'}"
            </div>

            {/* Letter Body */}
            <div className="space-y-3 text-[12px] leading-relaxed text-slate-800">
              <p className="font-bold text-slate-900">Respected Sir/Madam,</p>
              <p>
                I am writing to formally request your approval for an official permission slip. I am{' '}
                <strong>{studentName}</strong>, bearing Roll Number{' '}
                <strong className="font-mono">{rollNumber}</strong>, studying in Department of{' '}
                <strong>{department}</strong> (Section <strong>{section}</strong>).
              </p>
              <p>
                I have been granted permission for <strong>{pass.reasonLabel || pass.reason}</strong> on{' '}
                <strong>{pass.date}</strong> for the time slot of{' '}
                <strong>
                  {formatTime(pass.startTime)} to {formatTime(pass.endTime)}
                </strong>
                .
              </p>

              {/* Boxed Details */}
              <div className="pl-4 space-y-2 border-l-2 border-orange-500 bg-orange-50/40 p-3 rounded-r-lg text-[11.5px]">
                <p>
                  <strong>Permission Reason:</strong> {pass.reasonLabel || pass.reason}
                </p>
                <p>
                  <strong>Purpose &amp; Description:</strong> "{pass.description || 'Permission request.'}"
                </p>
                <p>
                  <strong>Date &amp; Time Slot:</strong> {pass.date} ({formatTime(pass.startTime)} –{' '}
                  {formatTime(pass.endTime)})
                </p>
                <p>
                  <strong>Approved Faculty / HOD:</strong> {approver}
                </p>
              </div>

              <p>
                I assure you that I will make up for any missed coursework or lab sessions promptly. I kindly request you
                to acknowledge and accept this permission slip.
              </p>
              <p>Thank you for your time, consideration, and continuous support.</p>
            </div>
          </div>

          {/* Signatures & Seal Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-[11px] font-sans">
            <div>
              <p className="font-bold text-slate-900 mb-4">Yours sincerely,</p>
              <div className="h-7 border-b border-slate-400 w-40 mb-1"></div>
              <p className="font-bold text-slate-900">{studentName}</p>
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900 mb-4">Forwarded &amp; Approved by:</p>
              <div className="h-7 border-b border-slate-400 w-44 mb-1 mx-auto flex items-end justify-center pb-0.5">
                <span className="text-[10px] font-bold text-orange-600 font-serif italic">Verified &amp; Approved</span>
              </div>
              <p className="font-bold text-slate-900">{approver}</p>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 flex flex-col items-center justify-center bg-transparent transform -rotate-12">
                <img src={logo} alt="AttendEase Official Seal" className="w-16 h-16 object-contain bg-transparent" />
                <span className="text-[7.5px] font-black uppercase text-orange-600 tracking-wider leading-none mt-1">
                  OFFICIAL SEAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
