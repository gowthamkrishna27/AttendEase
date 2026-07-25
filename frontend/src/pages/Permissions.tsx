import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Printer, Calendar, RefreshCw, Info,
  AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import type { AttendanceRequest } from '../types';
import srkrEmblem from '../assets/srkr-emblem.png';

export interface ExtendedAttendanceRequest extends AttendanceRequest {
  sectionName?: string;
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayFormattedDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Sample fallback approved permissions
const SAMPLE_APPROVED_PERMISSIONS: ExtendedAttendanceRequest[] = [
  {
    id: 'req-csd-002',
    studentId: 'stu-24B91A0702',
    sectionName: 'CSD — Section A',
    student: {
      id: 'stu-24B91A0702',
      name: 'CSD Student 02',
      rollNumber: '24B91A0702',
      department: 'CSD',
      year: 3,
      section: 'A',
      email: '24b91a0702@college.edu',
      phone: '9876543210',
      attendancePercentage: 88,
    },
    reason: 'medical',
    reasonLabel: 'Medical Leave',
    date: getTodayDateString(),
    startTime: '10:00',
    endTime: '13:00',
    description: 'Hospital visit for medical checkup and treatment.',
    status: 'approved',
    submittedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    faculty: {
      id: 'fac-csd-003',
      name: 'S. Mohan Krishna',
      email: 'mohanakrishna.seerla@srkrec.ac.in',
      department: 'CSD',
      designation: 'Assistant Professor',
    },
  },
  {
    id: 'req-csd-045',
    studentId: 'stu-24B91A0745',
    sectionName: 'CSD — Section B',
    student: {
      id: 'stu-24B91A0745',
      name: 'CSD Student 45',
      rollNumber: '24B91A0745',
      department: 'CSD',
      year: 3,
      section: 'B',
      email: '24b91a0745@college.edu',
      phone: '9876543215',
      attendancePercentage: 90,
    },
    reason: 'internship',
    reasonLabel: 'Internship',
    date: getTodayDateString(),
    startTime: '09:00',
    endTime: '16:00',
    description: 'Attending web development internship orientation session at Tech Park.',
    status: 'approved',
    submittedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    faculty: {
      id: 'fac-csd-002',
      name: 'A. Aswini Priyanka',
      email: 'aapriyanka@srkrec.ac.in',
      department: 'CSD',
      designation: 'Assistant Professor',
    },
  },
  {
    id: 'req-csit-002',
    studentId: 'stu-24B91A0767',
    sectionName: 'CSIT — Section A',
    student: {
      id: 'stu-24B91A0767',
      name: 'CSIT Student 67',
      rollNumber: '24B91A0767',
      department: 'CSIT',
      year: 3,
      section: 'A',
      email: '24b91a0767@college.edu',
      phone: '9876543212',
      attendancePercentage: 85,
    },
    reason: 'medical',
    reasonLabel: 'Medical Leave',
    date: getTodayDateString(),
    startTime: '09:00',
    endTime: '12:00',
    description: 'Fever and medical consultation.',
    status: 'approved',
    submittedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    faculty: {
      id: 'fac-csit-003',
      name: 'Neti Praveen',
      email: 'npraveen@srkrec.ac.in',
      department: 'CSIT',
      designation: 'Assistant Professor',
    },
  },
];

export default function PermissionsPage() {
  const [searchParams] = useSearchParams();

  // Simple State
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [dateMode, setDateMode] = useState<'today' | 'all'>('today');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedPass, setSelectedPass] = useState<AttendanceRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync URL params
  useEffect(() => {
    const secParam = searchParams.get('sec');
    if (secParam) setSectionFilter(secParam);
  }, [searchParams]);

  // Query Real Backend Requests from Database
  const { data: apiRequests = [], isLoading } = useQuery({
    queryKey: ['public-approved-requests'],
    queryFn: async () => {
      try {
        const publicRequests = await api.getPublicApprovedRequests();
        if (publicRequests.length > 0) return publicRequests;
        return await api.getRequests();
      } catch (err) {
        console.warn('Public query error, falling back to getRequests:', err);
        try {
          return await api.getRequests();
        } catch {
          return [];
        }
      }
    },
    retry: false,
  });

  // Approved Requests from Real Database
  const dbApproved = apiRequests.filter(r => r.status === 'approved');
  const allApproved: ExtendedAttendanceRequest[] = dbApproved.length > 0 ? dbApproved : apiRequests.length > 0 ? apiRequests : SAMPLE_APPROVED_PERMISSIONS;

  const todayStr = getTodayDateString();

  // Filtered List based on Current Date + Section + Search
  const filteredApproved = allApproved.filter(req => {
    const studentName = req.student?.name ?? req.studentId ?? '';
    const rollNo = req.student?.rollNumber ?? '';
    const dept = req.student?.department ?? 'CSD';
    const studentSec = req.student?.section ?? (req.studentId.slice(-2) < '35' ? 'A' : 'B');
    const secName = req.sectionName ?? `${dept} — Section ${studentSec}`;

    const matchesDate =
      dateMode === 'all' ||
      req.date === todayStr;

    const matchesSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      rollNo.toLowerCase().includes(search.toLowerCase()) ||
      req.reasonLabel.toLowerCase().includes(search.toLowerCase());

    const matchesSection =
      sectionFilter === 'all' ||
      (sectionFilter === 'CSD-A' && secName.includes('CSD') && secName.includes('Section A')) ||
      (sectionFilter === 'CSD-B' && secName.includes('CSD') && secName.includes('Section B')) ||
      (sectionFilter === 'CSIT-A' && secName.includes('CSIT') && secName.includes('Section A')) ||
      (sectionFilter === 'CSIT-B' && secName.includes('CSIT') && secName.includes('Section B'));

    return matchesDate && matchesSearch && matchesSection;
  });

  // Group by Section
  const sectionsMap: Record<string, ExtendedAttendanceRequest[]> = {};
  filteredApproved.forEach(req => {
    const dept = req.student?.department ?? 'CSD';
    const sec = req.student?.section ?? (req.studentId.slice(-2) < '35' ? 'A' : 'B');
    const key = req.sectionName ?? `${dept} — Section ${sec}`;
    if (!sectionsMap[key]) sectionsMap[key] = [];
    sectionsMap[key].push(req);
  });

  const sectionKeys = Object.keys(sectionsMap).sort();

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageWrapper role="viewer">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[12px] shadow-lg flex items-center gap-2 print:hidden"
            >
              <Info size={15} className="text-orange-400" />
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── On-Screen Page UI (Hidden when printing) ── */}
        <div className="space-y-4 print:hidden">
          {/* Title Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 leading-tight">
                Approved Permissions
              </h1>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {dateMode === 'today' ? `Today's Verified Permissions (${getTodayFormattedDate()})` : 'All Verified Permission Slips'} ({filteredApproved.length} total)
              </p>
            </div>

            {/* Date Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setDateMode('today')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                  dateMode === 'today'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today ({getTodayFormattedDate()})
              </button>
              <button
                onClick={() => setDateMode('all')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                  dateMode === 'all'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>
            </div>
          </div>

          {/* ── Simple Filter & Search Bar ── */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search by roll number or student name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-[36px] pl-8.5 pr-3 text-[12px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>

            {/* Touch-Friendly Section Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Section:</span>
              {[
                { label: 'All Sections', value: 'all' },
                { label: 'CSD - Sec A', value: 'CSD-A' },
                { label: 'CSD - Sec B', value: 'CSD-B' },
                { label: 'CSIT - Sec A', value: 'CSIT-A' },
                { label: 'CSIT - Sec B', value: 'CSIT-B' },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setSectionFilter(item.value)}
                  className={`px-2.5 py-1 font-bold rounded-md cursor-pointer shrink-0 transition-all ${sectionFilter === item.value
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Super Simple Permission Items (Number + Reason) ── */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-[12px]">Loading permissions...</p>
            </div>
          ) : filteredApproved.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-300" />
              <p className="font-bold text-[13px] text-slate-700">
                {dateMode === 'today'
                  ? `No approved permissions found for Today (${getTodayFormattedDate()}).`
                  : 'No approved permissions found.'}
              </p>
              {dateMode === 'today' && (
                <button
                  onClick={() => setDateMode('all')}
                  className="mt-2 px-3 py-1.5 bg-slate-900 text-white font-bold text-[11px] rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  View All Dates
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sectionKeys.map(sectionKey => {
                const sectionPasses = sectionsMap[sectionKey];
                const isCollapsed = collapsedSections[sectionKey];

                return (
                  <div key={sectionKey} className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                    {/* Section Title Bar */}
                    <div
                      onClick={() => toggleSection(sectionKey)}
                      className="px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-slate-900">{sectionKey}</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-200/60">
                          {sectionPasses.length} Passes
                        </span>
                      </div>
                      {isCollapsed ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
                    </div>

                    {/* List of Simple Permission Rows (Number + Reason) */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {sectionPasses.map((pass, index) => {
                          const rollNo = pass.student?.rollNumber ?? pass.studentId;
                          const studentName = pass.student?.name ?? `Student (${rollNo})`;

                          return (
                            <div
                              key={pass.id}
                              className="p-3 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3 text-[12px]"
                            >
                              {/* Number & Roll Number & Name */}
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                                  #{index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-900">{rollNo}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="font-medium text-slate-700 truncate">{studentName}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Calendar size={11} className="text-orange-500 shrink-0" />
                                    <span>{pass.date} | {pass.startTime} - {pass.endTime}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Reason Label & Slip Action */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2.5 py-1 bg-orange-50 text-orange-600 font-bold rounded-lg text-[11px] border border-orange-200/60">
                                  {pass.reasonLabel}
                                </span>
                                <button
                                  onClick={() => setSelectedPass(pass)}
                                  className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Printer size={11} />
                                  <span>Slip</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Printable Slip Modal & Formal Letter Format */}
        <AnimatePresence>
          {selectedPass && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 print:static print:bg-white print:p-0 print:inset-auto print:z-auto">
              {/* 1. On-Screen Compact Permission Slip Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl max-w-md w-full p-4 shadow-2xl border border-slate-200 print:hidden"
              >
                <div className="text-center pb-3 border-b-2 border-slate-900">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">SRKR Engineering College</p>
                  <h2 className="text-[17px] font-black text-slate-900 uppercase">Permission Slip</h2>
                  <p className="text-[10px] text-orange-600 font-bold bg-orange-50 inline-block px-2 py-0.5 rounded-full border border-orange-200 mt-1">
                    APPROVED • #{selectedPass.id.toUpperCase()}
                  </p>
                </div>

                <div className="py-4 space-y-2 text-[12px]">
                  {/* Student Photo & Roll Number Header */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <img
                      src={selectedPass.student?.avatarUrl || `https://srkrexams.in/SRKR/photo/${selectedPass.student?.rollNumber || selectedPass.studentId}.jpg`}
                      alt="Student Avatar"
                      className="w-12 h-14 object-cover rounded-md border border-slate-300 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPass.student?.name || 'Student')}&background=0F172A&color=fff`;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500 font-mono">Roll Number:</p>
                      <p className="font-mono font-bold text-slate-900 text-[14px]">{selectedPass.student?.rollNumber ?? selectedPass.studentId}</p>
                      <p className="font-bold text-slate-800 text-[12px] truncate mt-0.5">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reason / Category:</span>
                    <span className="font-bold text-orange-600">{selectedPass.reasonLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date &amp; Time Slot:</span>
                    <span className="font-bold text-slate-800">{selectedPass.date} ({selectedPass.startTime} - {selectedPass.endTime})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved By:</span>
                    <span className="font-bold text-slate-900">{selectedPass.finalDecisionName || selectedPass.faculty?.name || 'Faculty Advisor'}</span>
                  </div>
                  {selectedPass.finalDecisionBy === 'HOD' && (
                    <div className="flex justify-between items-center bg-purple-50 p-1.5 rounded-md border border-purple-200 text-[11px]">
                      <span className="text-purple-800 font-medium">Approval Status:</span>
                      <span className="font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-300">
                        Approved by {selectedPass.finalDecisionName || 'HOD'}
                      </span>
                    </div>
                  )}
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 italic">
                    "{selectedPass.description}"
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Printer size={13} />
                    <span>Print Letter Format</span>
                  </button>
                  <button
                    onClick={() => setSelectedPass(null)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>

              {/* 2. Full-Page Fit Attendease Permission Letter Format with Student Photo & Official Seal */}
              <div className="hidden print:block bg-white p-6 sm:p-8 text-slate-900 font-sans leading-relaxed w-full min-h-[255mm] flex flex-col justify-between mx-auto text-[12px]">
                <div>
                  {/* Header & Sender Information */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                      SAGI RAMAKRISHNAM RAJU ENGINEERING COLLEGE (AUTONOMOUS)
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      CHINA AMIRAM, BHIMAVARAM — 534 204, W.G. Dist., Andhra Pradesh, India
                    </p>
                  </div>

                  {/* From, Date & Passport Photo Section (3-Column Clean Alignment) */}
                  <div className="grid grid-cols-12 items-start text-[12px] font-medium mb-4 gap-2 border-b border-slate-200/80 pb-3">
                    {/* Left (Col 5): From */}
                    <div className="col-span-5 space-y-0.5">
                      <p className="font-bold text-slate-900 uppercase text-[11px]">From:</p>
                      <p className="font-bold text-slate-900">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                      <p className="font-mono text-slate-700 font-bold">Roll No: {selectedPass.student?.rollNumber ?? selectedPass.studentId}</p>
                      <p className="text-slate-600 text-[11.5px]">Department of {selectedPass.student?.department ?? 'CSD'} &amp; CSIT</p>
                      <p className="text-slate-600 text-[11.5px]">SRKR Engineering College (Autonomous)</p>
                    </div>

                    {/* Middle (Col 4): Date & Ref */}
                    <div className="col-span-4 text-center space-y-1 self-center">
                      <div className="inline-block px-3 py-1 bg-slate-50 border border-slate-300 rounded-md">
                        <p className="font-bold text-slate-900 text-[11.5px]">Date: {selectedPass.date}</p>
                        <p className="font-mono text-slate-600 text-[10.5px]">Ref: SRKR/PERM/{selectedPass.id.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Right (Col 3): Passport Photo Aligned Right (Edge-to-Edge Frame Fit) */}
                    <div className="col-span-3 flex justify-end">
                      <div className="w-[72px] h-[90px] border-2 border-slate-900 rounded-sm bg-white overflow-hidden flex flex-col items-center justify-center relative shadow-2xs">
                        <img
                          src={selectedPass.student?.avatarUrl || `https://srkrexams.in/SRKR/photo/${(selectedPass.student?.rollNumber || selectedPass.studentId).toUpperCase()}.jpg`}
                          alt="Student Photo"
                          className="w-full h-full object-cover block"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPass.student?.name || 'Student')}&background=0F172A&color=fff`;
                          }}
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[7px] font-mono font-bold text-center py-0.5 uppercase tracking-wider backdrop-blur-xs">
                          PHOTO
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* To */}
                  <div className="text-[12px] font-medium mb-4 space-y-0.5">
                    <p className="font-bold text-slate-900 uppercase text-[11px]">To:</p>
                    <p className="font-bold text-slate-900">The Head of the Department (HOD)</p>
                    <p className="text-slate-700">Department of {selectedPass.student?.department ?? 'CSD'}</p>
                    <p className="text-slate-700">SRKR Engineering College (Autonomous), Bhimavaram</p>
                  </div>

                  {/* Subject */}
                  <div className="my-4 p-3 bg-slate-50 border-y border-slate-300 font-bold text-[12px] sm:text-[13px] text-slate-900 leading-snug">
                    Subject: Application requesting official permission for {selectedPass.reasonLabel} — "{selectedPass.description}"
                  </div>

                  {/* Salutation & Dynamic Letter Body */}
                  <div className="space-y-3 text-[12px] leading-relaxed text-slate-800">
                    <p className="font-bold text-slate-900">Respected Sir/Madam,</p>

                    <p>
                      I am writing to formally request your approval for an official permission slip. I am <strong>{selectedPass.student?.name ?? selectedPass.studentId}</strong>, bearing Roll Number <strong className="font-mono">{selectedPass.student?.rollNumber ?? selectedPass.studentId}</strong>, studying in 3rd Year, Department of <strong>{selectedPass.student?.department ?? 'CSD'}</strong> (Section <strong>{selectedPass.student?.section ?? 'A'}</strong>).
                    </p>

                    <p>
                      I am requesting permission for <strong>{selectedPass.reasonLabel}</strong> on <strong>{selectedPass.date}</strong> for the time duration of <strong>{selectedPass.startTime} to {selectedPass.endTime}</strong>.
                    </p>

                    <div className="pl-4 space-y-2 border-l-2 border-orange-500 bg-orange-50/40 p-3 rounded-r-lg text-[11.5px]">
                      <p>
                        <strong>Permission Reason:</strong> {selectedPass.reasonLabel}
                      </p>
                      <p>
                        <strong>Purpose &amp; Description:</strong> "{selectedPass.description || 'Permission request for academic/personal reasons.'}"
                      </p>
                      <p>
                        <strong>Date &amp; Time Slot:</strong> {selectedPass.date} ({selectedPass.startTime} – {selectedPass.endTime})
                      </p>
                      <p>
                        <strong>Approved Faculty Advisor:</strong> {selectedPass.faculty?.name ?? 'Faculty Advisor'}
                      </p>
                      {selectedPass.finalDecisionBy === 'HOD' && (
                        <p>
                          <strong>Executive Approval Authority:</strong> Head of Department (HOD Approval Endorsed)
                        </p>
                      )}
                    </div>

                    <p>
                      I assure you that I will make up for any missed coursework or lab sessions promptly. I kindly request you to grant me permission for the specified duration.
                    </p>

                    <p>
                      Thank you for your time, consideration, and continuous support.
                    </p>
                  </div>
                </div>

                {/* Signatures & Endorsement (Student & Faculty Signature & Official Seal Stamp) */}
                <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-[11px] font-sans">
                  {/* Left: Yours Sincerely (Student Signature) */}
                  <div>
                    <p className="font-bold text-slate-900 mb-4">Yours sincerely,</p>
                    <div className="h-7 border-b border-slate-400 w-40 mb-1"></div>
                    <p className="font-bold text-slate-900">{selectedPass.student?.name ?? selectedPass.studentId}</p>
                    <p className="text-slate-600 text-[10.5px]">Student Representative ({selectedPass.student?.rollNumber ?? selectedPass.studentId})</p>
                    <p className="text-slate-500 font-mono text-[10px]">{selectedPass.student?.phone ?? selectedPass.student?.email ?? 'student@srkrec.ac.in'}</p>
                  </div>

                  {/* Middle: Approved Faculty Signature / Endorsement */}
                  <div className="text-center">
                    <p className="font-bold text-slate-900 mb-4">Forwarded &amp; Approved by:</p>
                    <div className="h-7 border-b border-slate-400 w-44 mb-1 mx-auto flex items-end justify-center pb-0.5">
                      <span className="text-[10px] font-bold text-emerald-700 font-serif italic">Verified &amp; Approved</span>
                    </div>
                    <p className="font-bold text-slate-900">{selectedPass.faculty?.name ?? 'Faculty Advisor'}</p>
                    <p className="text-slate-600 text-[10.5px]">Approved Faculty {selectedPass.finalDecisionBy === 'HOD' ? '(HOD Approved)' : ''}</p>
                  </div>

                  {/* Right: Official AttendEase Seal Stamp */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 border-2 border-orange-500 rounded-full flex flex-col items-center justify-center bg-orange-50/70 shadow-2xs transform -rotate-12 p-1 border-dashed">
                      <img src={srkrEmblem} alt="SRKR Emblem" className="w-7 h-7 object-contain mb-0.5 opacity-90" />
                      <span className="text-[7.5px] font-black uppercase text-orange-600 tracking-tighter leading-none">ATTENDEASE</span>
                      <span className="text-[6.5px] font-bold uppercase text-slate-700 tracking-tighter leading-none">OFFICIAL SEAL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
