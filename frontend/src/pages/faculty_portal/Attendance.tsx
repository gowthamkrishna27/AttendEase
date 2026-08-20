import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Building2, ChevronDown, CheckCircle2, AlertCircle,
  Calendar, Clock, Save, Lock, Check, RefreshCw, X
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import type { AttendanceSubmissionItem } from '../../lib/api';
import { getPeriodsFromRequest, extractRollSuffix } from '../../lib/utils';

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m || '00'} ${ampm}`;
};

const getFullRollNumber = (roll: string, year: string, sectionFilter?: string): string => {
  if (roll.length > 5) return roll.toUpperCase();
  const yearDigit = year.replace(/[^0-9]/g, '') || '3';

  // Department code: CSIT -> '07', CSD -> '62'
  const isCSIT = sectionFilter ? sectionFilter.includes('CSIT') : true;
  const deptCode = isCSIT ? '07' : '62';

  const prefix = yearDigit === '3' ? `24B91A${deptCode}` : yearDigit === '2' ? `25B91A${deptCode}` : yearDigit === '4' ? `23B91A${deptCode}` : `26B91A${deptCode}`;
  const lePrefix = yearDigit === '3' ? `25B95A${deptCode}` : yearDigit === '2' ? `26B95A${deptCode}` : yearDigit === '4' ? `24B95A${deptCode}` : `27B95A${deptCode}`;

  if (/^LE\d+$/i.test(roll)) {
    const leNum = roll.replace(/LE/i, '').padStart(2, '0');
    return `${lePrefix}${leNum}`;
  }
  return `${prefix}${roll.padStart(2, '0')}`;
};

const getStudentPhotoUrl = (roll: string, year: string, sectionFilter?: string): string => {
  const fullRoll = getFullRollNumber(roll, year, sectionFilter);
  return `https://srkrexams.in/SRKR/photo/${fullRoll.toUpperCase()}.jpg`;
};

// Period Definition with 45-min slots and 12:00 - 1:30 PM Lunch Break
export interface PeriodSlot {
  id: number;
  label: string;
  timeRange: string;
  startTime: string;
  endTime: string;
}

interface FacultyRollButtonProps {
  roll: string;
  studentName?: string;
  hasPermission: boolean;
  btnStyle: string;
  isOwner: boolean;
  onClick: (roll: string) => void;
  onSelectStudent: (roll: string) => void;
}

function FacultyRollButton({
  roll,
  studentName,
  hasPermission,
  btnStyle,
  isOwner,
  onClick,
  onSelectStudent,
}: FacultyRollButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = () => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onSelectStudent(roll);
    }, 400); // 400ms long press threshold
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onClick(roll);
  };

  return (
    <button
      type="button"
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onClick={handleClick}
      disabled={!isOwner}
      title={
        hasPermission
          ? `${studentName ? `${studentName} (${roll})` : `Roll #${roll}`}: Approved Permission — Press & Hold to view reason & details`
          : `${studentName ? `${studentName} (${roll})` : `Roll #${roll}`}: Press & Hold to view student profile`
      }
      className={`w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-2xl border flex flex-col items-center justify-center text-[13px] font-bold transition-all cursor-pointer select-none relative ${btnStyle} ${!isOwner ? 'cursor-not-allowed opacity-90' : ''
        }`}
    >
      {hasPermission && (
        <span className="absolute -top-1 px-1 py-0.2 bg-amber-500 text-white text-[7px] font-black rounded-full uppercase shadow-2xs">
          PERM
        </span>
      )}
      <span>{roll}</span>
    </button>
  );
}

const PERIOD_SLOTS: PeriodSlot[] = [
  { id: 1, label: 'Period 1', timeRange: '09:00 AM - 09:45 AM', startTime: '09:00', endTime: '09:45' },
  { id: 2, label: 'Period 2', timeRange: '09:45 AM - 10:30 AM', startTime: '09:45', endTime: '10:30' },
  { id: 3, label: 'Period 3', timeRange: '10:30 AM - 11:15 AM', startTime: '10:30', endTime: '11:15' },
  { id: 4, label: 'Period 4', timeRange: '11:15 AM - 12:00 PM', startTime: '11:15', endTime: '12:00' },
  { id: 5, label: 'Period 5', timeRange: '01:30 PM - 02:15 PM', startTime: '13:30', endTime: '14:15' },
  { id: 6, label: 'Period 6', timeRange: '02:15 PM - 03:00 PM', startTime: '14:15', endTime: '15:00' },
  { id: 7, label: 'Period 7', timeRange: '03:00 PM - 03:45 PM', startTime: '15:00', endTime: '15:45' },
  { id: 8, label: 'Period 8', timeRange: '03:45 PM - 04:30 PM', startTime: '15:45', endTime: '16:30' },
];

function getTodayFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FacultyAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Selection States (No default pre-selected parameters)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayFormattedDate());
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState<boolean>(false);

  // Selected Periods (e.g. [1, 2])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);

  // Marking mode: 'present' or 'absent'
  const [markMode, setMarkMode] = useState<'present' | 'absent'>('present');

  // Marked attendance state: rollNumber -> 'present' | 'absent'
  const [markedAttendance, setMarkedAttendance] = useState<Record<string, 'present' | 'absent'>>({});

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = useCallback((text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Format periods string key e.g. "1,2"
  const periodsKey = useMemo(() => {
    return [...selectedPeriodIds].sort((a, b) => a - b).join(',');
  }, [selectedPeriodIds]);

  // Format human-readable period label
  const periodLabelString = useMemo(() => {
    if (selectedPeriodIds.length === 0) return 'No period selected';
    const sorted = [...selectedPeriodIds].sort((a, b) => a - b);
    const slots = sorted.map(id => PERIOD_SLOTS.find(p => p.id === id)).filter(Boolean) as PeriodSlot[];
    if (slots.length === 1) return `${slots[0].label} (${slots[0].timeRange})`;

    const first = slots[0];
    const last = slots[slots.length - 1];
    return `Periods ${sorted.join(' & ')} (${first.timeRange.split(' - ')[0]} - ${last.timeRange.split(' - ')[1]})`;
  }, [selectedPeriodIds]);

  // Query existing attendance submissions for date & section
  const { data: existingSubmissions = [] } = useQuery<AttendanceSubmissionItem[]>({
    queryKey: ['attendanceSubmissions', selectedDate, sectionFilter, selectedYear],
    queryFn: () => api.getAttendanceSubmissions(selectedDate, sectionFilter, selectedYear),
  });

  // Stable empty-array constant — avoids new reference on every render when query data is undefined.
  // BUG FIX: Using `= []` inline creates a new array reference each render → permissionStudentsSet
  // recalculates → useEffect fires → setMarkedAttendance called every render → infinite loop.
  const STABLE_EMPTY = useMemo<api.AttendanceRequest[]>(() => [], []);

  // Query approved permission passes for date pre-highlighting
  // NOTE: Do NOT pass `department` here — section + year already scope correctly.
  // Passing the faculty's own department would eliminate students from other departments
  // who have approved permissions (e.g. CSD faculty marking CSIT section attendance).
  const { data: approvedRequestsRaw } = useQuery({
    queryKey: ['public-approved-requests-for-attendance', selectedDate, sectionFilter, selectedYear],
    queryFn: () => api.getPublicApprovedRequests({
      date: selectedDate,
      section: sectionFilter,
      year: selectedYear,
    }),
    retry: 1,
  });
  const approvedRequests = approvedRequestsRaw ?? STABLE_EMPTY;

  // Query all students list for name resolution & details
  const { data: allStudents = [] } = useQuery<api.Student[]>({
    queryKey: ['all-students-list'],
    queryFn: () => api.getAllStudents(),
    staleTime: 5 * 60 * 1000,
  });

  // Map of full roll numbers, suffixes, userIds to Student record for fast lookup
  const studentInfoMap = useMemo(() => {
    const map = new Map<string, api.Student>();
    allStudents.forEach(s => {
      if (s.rollNumber) {
        const fullUpper = s.rollNumber.toUpperCase().trim();
        map.set(fullUpper, s);

        const suffix = extractRollSuffix(s.rollNumber);
        if (suffix) {
          map.set(suffix.toUpperCase().trim(), s);
          const num = parseInt(suffix, 10);
          if (!isNaN(num)) {
            map.set(String(num), s);
            map.set(String(num).padStart(2, '0'), s);
          }
        }
      }
      if (s.id) {
        map.set(s.id.toUpperCase().trim(), s);
      }
    });
    return map;
  }, [allStudents]);

  // Check if an attendance request is valid for the target date (single day or date range)
  const isRequestOnDate = useCallback((req: api.AttendanceRequest, targetDate: string) => {
    if (!req.date) return false;
    const start = req.date.trim().slice(0, 10);
    const end = (req.endDate ? req.endDate.trim().slice(0, 10) : start);
    return targetDate >= start && targetDate <= end;
  }, []);

  // Check if a student belongs to the selected Academic Year and Branch/Section
  const isStudentInSectionAndYear = useCallback((
    studentOrRoll: string | api.Student | undefined,
    targetYear: string,
    targetSection: string
  ): boolean => {
    if (!targetYear || !targetSection) return false;

    let student: api.Student | undefined;
    let roll = '';

    if (typeof studentOrRoll === 'string') {
      roll = studentOrRoll.trim();
      student = studentInfoMap.get(roll.toUpperCase()) || studentInfoMap.get(roll);
    } else if (studentOrRoll) {
      student = studentOrRoll;
      roll = (student.rollNumber || student.id || '').trim();
    }

    if (!roll && !student) return false;

    // 1. Year Matching
    const targetDigit = targetYear.replace(/[^1-4]/g, ''); // '1', '2', '3', '4'
    let studentYearDigit = '';

    if (student?.year) {
      const match = student.year.match(/([1-4])/);
      if (match) studentYearDigit = match[1];
    }
    if (!studentYearDigit && student?.semester) {
      studentYearDigit = String(Math.ceil(student.semester / 2));
    }
    if (!studentYearDigit && roll) {
      const upperRoll = roll.toUpperCase();
      const isLateral = upperRoll.includes('95A') || upperRoll.includes('LE') || /^LE\d+$/i.test(upperRoll);
      if (upperRoll.startsWith('24B') && !isLateral) studentYearDigit = '3';
      else if (upperRoll.startsWith('25B') && isLateral) studentYearDigit = '3';
      else if (upperRoll.startsWith('25B') && !isLateral) studentYearDigit = '2';
      else if (upperRoll.startsWith('26B') && isLateral) studentYearDigit = '2';
      else if (upperRoll.startsWith('26B') && !isLateral) studentYearDigit = '1';
      else if (upperRoll.startsWith('23B') && !isLateral) studentYearDigit = '4';
      else if (upperRoll.startsWith('24B') && isLateral) studentYearDigit = '4';
    }

    if (targetDigit && studentYearDigit && targetDigit !== studentYearDigit) {
      return false;
    }

    // 2. Section & Department Matching
    const targetSecUpper = targetSection.toUpperCase().replace(/\s+/g, '');
    const rollUpper = roll.toUpperCase();

    // Check Department
    const isTargetCSD = targetSecUpper.includes('CSD');
    const isTargetCSIT = targetSecUpper.includes('CSIT');

    const studentDept = (student?.department || '').toUpperCase();
    if (isTargetCSD) {
      if (studentDept && !studentDept.includes('CSD') && (studentDept.includes('CSIT') || studentDept.includes('IT'))) {
        return false;
      }
      if (rollUpper.includes('07') && !rollUpper.includes('62')) {
        return false;
      }
    } else if (isTargetCSIT) {
      if (studentDept && studentDept.includes('CSD')) {
        return false;
      }
      if (rollUpper.includes('62') && !rollUpper.includes('07')) {
        return false;
      }
    }

    // Check Section Letter (A or B)
    const isTargetSecB = targetSecUpper.endsWith('B') || targetSecUpper.endsWith('-B');
    let studentSecLetter = '';

    if (student?.section) {
      const s = student.section.toUpperCase().replace(/SECTION/i, '').replace(/SEC/i, '').trim();
      if (s === 'A' || s === 'B') studentSecLetter = s;
    }

    if (!studentSecLetter && rollUpper) {
      const isSecB = /(7[3-9]|[89]\d|[A-C]\d|D[01]|LE\d+)$/i.test(rollUpper) || rollUpper.includes('95A');
      studentSecLetter = isSecB ? 'B' : 'A';
    }

    if (isTargetSecB && studentSecLetter !== 'B') return false;
    if (!isTargetSecB && studentSecLetter === 'B') return false;

    return true;
  }, [studentInfoMap]);

  // Set of unique full roll numbers of students with approved permissions for selectedDate, selectedYear, and sectionFilter AND matching selectedPeriodIds
  const approvedStudentRollsSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedPeriodIds.length === 0 || !selectedYear || !sectionFilter) return set;

    approvedRequests.forEach(req => {
      if (req.status === 'approved' && isRequestOnDate(req, selectedDate)) {
        const studentObj = req.student || (req.studentId ? studentInfoMap.get(req.studentId.toUpperCase()) : undefined);
        const matchesSectionAndYear = isStudentInSectionAndYear(
          studentObj || req.student?.rollNumber || req.studentId,
          selectedYear,
          sectionFilter
        );

        if (!matchesSectionAndYear) return;

        // Period overlap check: req periods must overlap with currently selected faculty periods
        const reqPeriods = getPeriodsFromRequest(req);
        const hasOverlap = selectedPeriodIds.some(pId => reqPeriods.includes(pId));

        if (hasOverlap) {
          const rollStr = req.student?.rollNumber ?? req.studentId ?? '';
          if (rollStr) {
            set.add(rollStr.trim());
          }
        }
      }
    });
    return set;
  }, [approvedRequests, selectedDate, selectedPeriodIds, selectedYear, sectionFilter, isRequestOnDate, isStudentInSectionAndYear, studentInfoMap]);

  // Unique count of approved permission students (for banner)
  const approvedStudentsCount = approvedStudentRollsSet.size;

  // Map of roll strings and suffixes for grid button lookup
  const permissionStudentsSet = useMemo(() => {
    const set = new Set<string>();
    approvedStudentRollsSet.forEach(rollStr => {
      const trimmed = rollStr.trim();
      const upper = trimmed.toUpperCase();
      set.add(trimmed);
      set.add(upper);

      const suffix = extractRollSuffix(trimmed);
      if (suffix) {
        const sufUpper = suffix.toUpperCase();
        set.add(suffix);
        set.add(sufUpper);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) {
          set.add(String(num));
          set.add(String(num).padStart(2, '0'));
        }
      }
    });
    return set;
  }, [approvedStudentRollsSet]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, api.AttendanceRequest>();
    if (selectedPeriodIds.length === 0 || !selectedYear || !sectionFilter) return map;

    approvedRequests.forEach(req => {
      if (req.status === 'approved' && isRequestOnDate(req, selectedDate)) {
        const studentObj = req.student || (req.studentId ? studentInfoMap.get(req.studentId.toUpperCase()) : undefined);
        const matchesSectionAndYear = isStudentInSectionAndYear(
          studentObj || req.student?.rollNumber || req.studentId,
          selectedYear,
          sectionFilter
        );

        if (!matchesSectionAndYear) return;

        const reqPeriods = getPeriodsFromRequest(req);
        const hasOverlap = selectedPeriodIds.some(pId => reqPeriods.includes(pId));
        if (hasOverlap) {
          const rollStr = (req.student?.rollNumber ?? req.studentId ?? '').trim();
          if (rollStr) {
            const upper = rollStr.toUpperCase();
            map.set(rollStr, req);
            map.set(upper, req);

            const suffix = extractRollSuffix(rollStr);
            if (suffix) {
              const sufUpper = suffix.toUpperCase();
              map.set(suffix, req);
              map.set(sufUpper, req);
              const num = parseInt(suffix, 10);
              if (!isNaN(num)) {
                map.set(String(num), req);
                map.set(String(num).padStart(2, '0'), req);
              }
            }
          }
        }
      }
    });
    return map;
  }, [approvedRequests, selectedDate, selectedPeriodIds, selectedYear, sectionFilter, isRequestOnDate, isStudentInSectionAndYear, studentInfoMap]);

  // Derive a stable primitive string from the Set so useEffect can use it as a dep
  // without firing on every render due to Set object reference changes.
  const permissionRollsKey = useMemo(
    () => [...permissionStudentsSet].sort().join(','),
    [permissionStudentsSet]
  );

  // Find submission matching current selected periods
  // Bug 11 Fix: Normalize both sides to sorted comma-separated form
  // so "2,1" stored in DB matches "1,2" from frontend
  const currentSubmission = useMemo(() => {
    const normalizePeriodsStr = (p: string | number | undefined | null): string => {
      if (!p) return '';
      const s = String(p).trim();
      const nums = s.includes(',')
        ? s.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n))
        : [Number(s)].filter(n => !isNaN(n));
      return [...new Set(nums)].sort((a, b) => a - b).join(',');
    };
    const normalizedKey = normalizePeriodsStr(periodsKey);
    return existingSubmissions.find(sub => normalizePeriodsStr(String(sub.periods)) === normalizedKey);
  }, [existingSubmissions, periodsKey]);

  // Check ownership (Faculty can update attendance they personally marked, Admin & HOD can edit all)
  const isOwner = useMemo(() => {
    if (!currentSubmission) return true;
    const currentUserId = (user?.id || user?.userId || '').toLowerCase().trim();
    const markedById = (currentSubmission.markedById || '').toLowerCase().trim();
    const userEmail = (user?.email || '').toLowerCase().trim();
    const markedEmail = (currentSubmission.markedBy?.email || '').toLowerCase().trim();

    return (
      (currentUserId && markedById && currentUserId === markedById) ||
      (userEmail && markedEmail && userEmail === markedEmail) ||
      user?.role === 'admin' ||
      user?.role === 'hod'
    );
  }, [currentSubmission, user]);

  // Ref to track the last submission ID and permissionRollsKey that triggered a re-population
  // to prevent useEffect from calling setMarkedAttendance when nothing actually changed.
  const lastPopulatedRef = useRef<{ submissionId: string | undefined; permissionKey: string }>({
    submissionId: undefined,
    permissionKey: '',
  });

  // Populate grid when switching periods/date/section if a submission exists, and pre-mark permissions as present
  // BUG FIX: Use permissionRollsKey (stable string) instead of permissionStudentsSet (object ref)
  // to prevent re-firing on every render when Set content hasn't actually changed.
  useEffect(() => {
    const submissionId = currentSubmission?.id;
    const prevRef = lastPopulatedRef.current;

    // Early exit: skip if nothing content-wise has changed
    if (submissionId === prevRef.submissionId && permissionRollsKey === prevRef.permissionKey) {
      return;
    }
    lastPopulatedRef.current = { submissionId, permissionKey: permissionRollsKey };

    const initialMap: Record<string, 'present' | 'absent'> = {};
    if (currentSubmission && currentSubmission.records) {
      currentSubmission.records.forEach(rec => {
        initialMap[rec.rollNumber] = rec.status as 'present' | 'absent';
      });
    }
    // Automatically default students with approved permissions to present if unmarked
    permissionStudentsSet.forEach(roll => {
      if (!initialMap[roll]) {
        initialMap[roll] = 'present';
      }
    });
    setMarkedAttendance(initialMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubmission, permissionRollsKey]);

  // Roll numbers generator for section
  const currentRollNumbers = useMemo(() => {
    if (sectionFilter.includes('B') || sectionFilter === 'CSIT-B') {
      const rolls: string[] = [];
      for (let i = 73; i <= 99; i++) rolls.push(String(i));
      const series = ['A', 'B', 'C'];
      series.forEach(prefix => {
        for (let i = 0; i <= 9; i++) rolls.push(`${prefix}${i}`);
      });
      rolls.push('D0', 'D1');
      for (let i = 1; i <= 13; i++) rolls.push(`LE${i}`);
      return rolls;
    }
    // Section A (CSD, CSD-A, CSIT-A, CSIT A)
    return Array.from({ length: 72 }, (_, i) => String(i + 1));
  }, [sectionFilter]);

  // Toggle roll button state
  const handleRollClick = useCallback((roll: string) => {
    if (!isOwner) {
      showToast(`Read-only: Attendance was submitted by ${currentSubmission?.markedBy?.name ?? 'another faculty'}`, true);
      return;
    }

    setMarkedAttendance(prev => {
      const current = prev[roll];
      if (!current) {
        return { ...prev, [roll]: markMode };
      }
      if (current === markMode) {
        const next = { ...prev };
        delete next[roll];
        return next;
      }
      return { ...prev, [roll]: markMode };
    });
  }, [isOwner, markMode, currentSubmission, showToast]);

  // Student Photo Card Modal state & preview trigger for long-press
  const [selectedStudentModal, setSelectedStudentModal] = useState<{
    rollNo: string;
    fullRollNo: string;
    name?: string;
    department: string;
    section: string;
    year: string;
    avatarUrl: string;
    status?: 'present' | 'absent' | 'unmarked';
    hasPermission: boolean;
    permission?: {
      id: string;
      reasonLabel: string;
      description?: string;
      approvedBy?: string;
      timeRange?: string;
      date?: string;
    };
  } | null>(null);

  const handleSelectStudentForPreview = useCallback((roll: string) => {
    const fullRoll = getFullRollNumber(roll, selectedYear, sectionFilter);
    const avatarUrl = getStudentPhotoUrl(roll, selectedYear, sectionFilter);

    // Look up permission pass if available for this roll
    const permissionReq = permissionMap.get(roll) ||
                           permissionMap.get(fullRoll) ||
                           permissionMap.get(roll.toUpperCase()) ||
                           permissionMap.get(fullRoll.toUpperCase());

    const hasPermission = Boolean(permissionReq || permissionStudentsSet.has(roll) || permissionStudentsSet.has(roll.toUpperCase()));

    // Look up student from studentInfoMap or permissionReq
    const matchedStudent = studentInfoMap.get(fullRoll.toUpperCase()) ||
                           studentInfoMap.get(roll.toUpperCase()) ||
                           permissionReq?.student;

    const studentName = matchedStudent?.name || permissionReq?.student?.name || undefined;

    const rawStatus = markedAttendance[roll];

    let effectiveStatus: 'present' | 'absent' | 'unmarked' = 'unmarked';
    if (rawStatus) {
      effectiveStatus = rawStatus;
    } else if (hasPermission) {
      effectiveStatus = 'present';
    } else if (Object.keys(markedAttendance).length > 0) {
      effectiveStatus = markMode === 'present' ? 'absent' : 'present';
    }

    let permissionData: {
      id: string;
      reasonLabel: string;
      description?: string;
      approvedBy?: string;
      timeRange?: string;
      date?: string;
    } | undefined = undefined;

    if (permissionReq) {
      const timeStr = (permissionReq.startTime && permissionReq.endTime)
        ? `${formatTime(permissionReq.startTime)} - ${formatTime(permissionReq.endTime)}`
        : undefined;
      const approvedByStr = permissionReq.finalDecisionName || permissionReq.faculty?.name || 'Faculty / HOD';

      permissionData = {
        id: permissionReq.id,
        reasonLabel: permissionReq.reasonLabel || 'Official Permission',
        description: permissionReq.description,
        approvedBy: approvedByStr,
        timeRange: timeStr,
        date: permissionReq.date,
      };
    }

    setSelectedStudentModal({
      rollNo: roll,
      fullRollNo: fullRoll,
      name: studentName,
      department: matchedStudent?.department || (sectionFilter.startsWith('CSD') ? 'CSD' : 'CSIT'),
      section: matchedStudent?.section || sectionFilter,
      year: matchedStudent?.year || selectedYear,
      avatarUrl: matchedStudent?.avatarUrl || avatarUrl,
      status: effectiveStatus,
      hasPermission,
      permission: permissionData,
    });
  }, [selectedYear, sectionFilter, markedAttendance, permissionStudentsSet, markMode, studentInfoMap, permissionMap]);

  // Period Slot Toggle
  const togglePeriodSlot = (id: number) => {
    setSelectedPeriodIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      }
      return [...prev, id];
    });
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: api.SubmitAttendancePayload) => api.submitSectionAttendance(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSubmissions'] });
      showToast(`Attendance for ${data.periodLabel || 'selected periods'} submitted successfully!`);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to submit attendance', true);
    },
  });

  const handleSubmit = () => {
    if (selectedPeriodIds.length === 0) {
      showToast('Please select at least one period before submitting.', true);
      return;
    }

    // Build complete record list for every student in the section
    const recordsPayload = currentRollNumbers.map(roll => {
      let status: 'present' | 'absent' = 'absent';
      const rawStatus = markedAttendance[roll];

      if (rawStatus) {
        status = rawStatus;
      } else if (permissionStudentsSet.has(roll)) {
        status = 'present';
      } else if (markMode === 'absent') {
        // If faculty operated in absentees mode, unmarked non-absent students default to present
        status = 'present';
      } else {
        // If faculty operated in presentees mode, unmarked students default to absent
        status = 'absent';
      }

      return { rollNumber: roll, status };
    });

    submitMutation.mutate({
      date: selectedDate,
      section: sectionFilter,
      year: selectedYear,
      periods: periodsKey,
      periodLabel: periodLabelString,
      records: recordsPayload,
    });
  };

  // Stats calculation
  const totalStudentsCount = currentRollNumbers.length;
  const presentCount = useMemo(() => Object.values(markedAttendance).filter(v => v === 'present').length, [markedAttendance]);
  const absentCount = useMemo(() => Object.values(markedAttendance).filter(v => v === 'absent').length, [markedAttendance]);
  const unmarkedCount = totalStudentsCount - (presentCount + absentCount);

  return (
    <PageWrapper role="faculty">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-white text-[13px] font-bold ${toastMsg.isError ? 'bg-rose-600' : 'bg-orange-500'
                }`}
            >
              {toastMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{toastMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Page Header ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-0.5">
              Faculty Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
              Mark Section Attendance
            </h1>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Select class periods and mark student attendance for public verification
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-700">
              <Calendar size={14} className="text-orange-500 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* ── Year & Section Selector Container ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-3.5 shadow-xs">

          {/* Top Row: Year Selection (Square buttons with rounded corners) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
              <GraduationCap size={15} className="text-orange-500" />
              YEAR:
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: '1', value: '1st Year' },
                { label: '2', value: '2nd Year' },
                { label: '3', value: '3rd Year' },
                { label: '4', value: '4th Year' },
              ].map(yr => (
                <button
                  key={yr.value}
                  type="button"
                  onClick={() => {
                    setSelectedYear(selectedYear === yr.value ? '' : yr.value);
                    setSectionFilter('');
                    setSelectedPeriodIds([]);
                    setMarkedAttendance({});
                  }}
                  title={yr.value}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer ${selectedYear === yr.value
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                    }`}
                >
                  {yr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Second Row: Full-width Section Dropdown Bar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              className="w-full h-[42px] px-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-[13px] font-bold text-slate-800 transition-all cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" />
                <span className="text-slate-400 font-medium">Select Target Section:</span>
                <span className="text-slate-900 font-bold">
                  {!selectedYear
                    ? 'Select Year First...'
                    : !sectionFilter
                      ? 'Choose Section...'
                      : sectionFilter === 'CSD-A'
                        ? 'CSD — Section A'
                        : sectionFilter === 'CSIT-A'
                          ? 'CSIT — Section A'
                          : sectionFilter === 'CSIT-B'
                            ? 'CSIT — Section B'
                            : sectionFilter}
                </span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isSectionDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute left-0 right-0 top-[48px] z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1"
                >
                  {!selectedYear ? (
                    <div className="px-4 py-3 text-center text-slate-400 text-[12px]">
                      Please select an Academic Year first
                    </div>
                  ) : (
                    [
                      { label: 'CSD - Sec A', value: 'CSD-A' },
                      { label: 'CSIT - Sec A', value: 'CSIT-A' },
                      { label: 'CSIT - Sec B', value: 'CSIT-B' },
                    ].map(sec => (
                      <button
                        key={sec.value}
                        type="button"
                        onClick={() => {
                          setSectionFilter(sec.value);
                          setIsSectionDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[12px] font-bold flex items-center justify-between hover:bg-orange-50 transition-colors cursor-pointer ${sectionFilter === sec.value ? 'text-orange-600 bg-orange-50/60' : 'text-slate-700'
                          }`}
                      >
                        <span>{sec.label}</span>
                        {sectionFilter === sec.value && <CheckCircle2 size={15} className="text-orange-500" />}
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 45-Minute Period Selection Grid ── */}
          <div className="pt-2.5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-orange-500" />
                Select Class Period(s) for Attendance:
              </span>
              <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {periodLabelString}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {PERIOD_SLOTS.map(slot => {
                const isSelected = selectedPeriodIds.includes(slot.id);
                // Check if this period slot is locked by another faculty member
                const subForSlot = existingSubmissions.find(s => {
                  const rawP: unknown = s.periods;
                  const pArr = typeof rawP === 'string'
                    ? rawP.split(',').map(n => Number(n.trim()))
                    : Array.isArray(rawP)
                      ? rawP.map((n: unknown) => Number(n))
                      : [Number(rawP)];
                  return pArr.includes(slot.id);
                });
                const currentUid = (user?.id || user?.userId || '').toLowerCase().trim();
                const currentUemail = (user?.email || '').toLowerCase().trim();
                const subUid = (subForSlot?.markedById || '').toLowerCase().trim();
                const subUemail = (subForSlot?.markedBy?.email || '').toLowerCase().trim();

                const isLocked = Boolean(
                  subForSlot &&
                  !(currentUid && subUid && currentUid === subUid) &&
                  !(currentUemail && subUemail && currentUemail === subUemail) &&
                  user?.role !== 'admin' &&
                  user?.role !== 'hod'
                );
                const lockedBy = isLocked ? subForSlot?.markedBy?.name || 'Faculty' : null;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={Boolean(isLocked)}
                    onClick={() => {
                      if (isLocked) {
                        showToast(`Period ${slot.id} is locked (Submitted by ${lockedBy}).`, true);
                        return;
                      }
                      togglePeriodSlot(slot.id);
                    }}
                    title={isLocked ? `Locked by ${lockedBy}` : slot.timeRange}
                    className={`px-3 py-2 rounded-xl border text-left flex flex-col justify-between transition-all select-none relative ${isLocked
                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                        : isSelected
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm scale-[1.02] cursor-pointer'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full font-bold">
                      <span className="flex items-center gap-1">
                        {slot.label}
                        {isLocked && <Lock size={11} className="text-amber-600" />}
                      </span>
                      {isSelected && !isLocked ? <Check size={14} /> : <span className="text-[9px] opacity-60">45m</span>}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${isLocked ? 'text-slate-400' : isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                      {isLocked ? `Locked (${lockedBy?.split(' ')[0]})` : slot.timeRange}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lunch Break Note */}
            <div className="text-[10px] text-slate-400 font-medium text-center pt-0.5">
              🍱 Lunch Break: 12:00 PM – 01:30 PM
            </div>
          </div>
        </div>

        {/* ── Conditional Render: Require Year, Branch/Section & Period Numbers Selection ── */}
        {!selectedYear || !sectionFilter || selectedPeriodIds.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center mx-auto shadow-xs">
              <Calendar size={24} />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Select Academic Year, Branch &amp; Period Numbers</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Student roll numbers and approved permissions will appear here once you select the required Academic Year, Branch/Section, and Period number(s) above.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Approved Permission Notice Banner ── */}
            {approvedStudentsCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300/80 text-amber-900 rounded-xl text-[12px] font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>
                    {approvedStudentsCount} Student(s) have approved permissions for Period(s) {selectedPeriodIds.join(', ')} today (Pre-highlighted in 🟡 Yellow).
                  </span>
                </div>
                <span className="text-[10.5px] bg-amber-200/80 px-2 py-0.5 rounded-md text-amber-950 font-black uppercase tracking-wider">
                  Auto-Protected
                </span>
              </div>
            )}

            {/* ── Submitter Ownership Warning / Status Badge ── */}
            {currentSubmission && (
              <div className={`p-3 rounded-xl border flex items-center justify-between text-[12px] font-bold ${isOwner
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                <div className="flex items-center gap-2">
                  {isOwner ? <CheckCircle2 size={16} className="text-orange-600" /> : <Lock size={16} className="text-amber-600" />}
                  <span>
                    {isOwner
                      ? `Previously marked by you (${currentSubmission.markedBy?.name})`
                      : `Marked by ${currentSubmission.markedBy?.name} (${currentSubmission.markedBy?.department}) — Read Only`}
                  </span>
                </div>
                <span className="text-[11px] opacity-75 font-medium">
                  Submitted: {new Date(currentSubmission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* ── Grid Container & Interactive Marking Controls ── */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-xs">

              {/* Click Mode Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    Click Mode:
                  </span>
                  <div className="flex items-center gap-2">
                    <label className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all text-[12px] font-bold ${markMode === 'present'
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}>
                      <input
                        type="radio"
                        name="markMode"
                        checked={markMode === 'present'}
                        onChange={() => setMarkMode('present')}
                        className="sr-only"
                      />
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${markMode === 'present' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'}`} />
                      <span>Presentees</span>
                    </label>

                    <label className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all text-[12px] font-bold ${markMode === 'absent'
                        ? 'bg-rose-50/80 border-rose-300 text-rose-900 shadow-2xs ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}>
                      <input
                        type="radio"
                        name="markMode"
                        checked={markMode === 'absent'}
                        onChange={() => setMarkMode('absent')}
                        className="sr-only"
                      />
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${markMode === 'absent' ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : 'bg-slate-400'}`} />
                      <span>Absentees</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Quick Counter Summary */}
              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span>Total: <strong className="text-slate-900">{totalStudentsCount}</strong></span>
                <span className="text-emerald-700">Present: <strong>{presentCount}</strong></span>
                <span className="text-rose-700">Absent: <strong>{absentCount}</strong></span>
                <span className="text-slate-400">Unmarked: <strong>{unmarkedCount}</strong></span>
              </div>

              {/* Stationary Icon-App Launcher Grid */}
              <div className="max-w-[820px] mx-auto pt-2 pb-2">
                <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 justify-items-center">
                  {currentRollNumbers.map(roll => {
                    const rawStatus = markedAttendance[roll];
                    const hasPermission = permissionStudentsSet.has(roll);
                    const permissionReq = permissionMap.get(roll);

                    let effectiveStatus = rawStatus;
                    if (!rawStatus) {
                      if (hasPermission) {
                        effectiveStatus = 'present';
                      } else if (Object.keys(markedAttendance).length > 0) {
                        if (markMode === 'present') {
                          effectiveStatus = 'absent';
                        } else if (markMode === 'absent') {
                          effectiveStatus = 'present';
                        }
                      }
                    }

                    const matchedStudent = studentInfoMap.get(roll.toUpperCase()) ||
                                           permissionMap.get(roll)?.student;
                    const studentName = matchedStudent?.name;

                    let btnStyle = 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-200/80';
                    if (hasPermission) {
                      // Yellow Approved Permission — IMMUTABLY Yellow for approved permission students
                      btnStyle = 'bg-[#FDE047] text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/80 font-black scale-[1.02]';
                    } else if (effectiveStatus === 'present') {
                      btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20 scale-[1.02] font-extrabold';
                    } else if (effectiveStatus === 'absent') {
                      btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20 scale-[1.02] font-extrabold';
                    }

                    return (
                      <FacultyRollButton
                        key={roll}
                        roll={roll}
                        studentName={studentName}
                        hasPermission={hasPermission}
                        btnStyle={btnStyle}
                        isOwner={isOwner}
                        onClick={handleRollClick}
                        onSelectStudent={handleSelectStudentForPreview}
                      />
                    );
                  })}
                </div>
              </div>

              {/* ── Submit / Update Attendance Button (Positioned at the bottom of the numbers list) ── */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  disabled={!isOwner || submitMutation.isPending}
                  onClick={handleSubmit}
                  className={`w-full sm:w-auto min-w-[260px] py-3 px-6 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${!isOwner
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : submitMutation.isPending
                        ? 'bg-orange-400 text-white cursor-wait'
                        : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-orange-500/25 ring-2 ring-orange-500/20'
                    }`}
                >
                  {submitMutation.isPending ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>
                    {currentSubmission ? 'Update Attendance' : 'Submit Attendance'}
                  </span>
                </button>
              </div>

            </div>
          </>
        )}

        {/* Student Photo Preview Card Modal (on Long Press of Any Roll Number) */}
        <AnimatePresence>
          {selectedStudentModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-xs sm:max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-3.5 relative overflow-hidden"
              >
                <button
                  onClick={() => setSelectedStudentModal(null)}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>

                {/* Student Photo */}
                <div className={`w-28 h-34 rounded-2xl border-2 overflow-hidden mx-auto shadow-md relative group ${
                  selectedStudentModal.hasPermission ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-orange-500'
                }`}>
                  <img
                    src={selectedStudentModal.avatarUrl}
                    alt={`Student ${selectedStudentModal.name || selectedStudentModal.fullRollNo}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudentModal.name || selectedStudentModal.fullRollNo)}&background=F97316&color=fff&size=128`;
                    }}
                  />
                </div>

                {/* Student Info */}
                <div className="space-y-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    selectedStudentModal.hasPermission
                      ? 'bg-amber-100 border border-amber-300 text-amber-900'
                      : 'bg-orange-50 border border-orange-200 text-orange-700'
                  }`}>
                    {selectedStudentModal.hasPermission ? '🟡 Approved Permission Student' : 'SRKR Student Profile'}
                  </span>
                  {selectedStudentModal.name ? (
                    <div className="pt-1">
                      <h3 className="text-lg font-black text-slate-900 leading-snug">
                        {selectedStudentModal.name}
                      </h3>
                      <p className="text-sm font-mono font-bold text-orange-600 mt-0.5">
                        {selectedStudentModal.fullRollNo}
                      </p>
                    </div>
                  ) : (
                    <h3 className="text-lg font-extrabold text-slate-900 font-mono pt-1">
                      {selectedStudentModal.fullRollNo}
                    </h3>
                  )}
                  <p className="text-xs text-slate-500 font-bold">
                    {selectedStudentModal.year} • {selectedStudentModal.section}
                  </p>
                </div>

                {/* Permission Reason & Details Box (when student has an approved permission pass) */}
                {selectedStudentModal.permission && (
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-xl border border-amber-200/90 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-amber-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Permission Reason
                      </span>
                      <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold rounded-md text-[10.5px] shadow-2xs">
                        {selectedStudentModal.permission.reasonLabel}
                      </span>
                    </div>

                    {selectedStudentModal.permission.description && (
                      <div className="text-[11.5px] text-amber-950/90 italic leading-snug">
                        "{selectedStudentModal.permission.description}"
                      </div>
                    )}

                    <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                      {selectedStudentModal.permission.timeRange && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Time Slot:</span>
                          <span className="font-bold text-slate-800">{selectedStudentModal.permission.timeRange}</span>
                        </div>
                      )}
                      {selectedStudentModal.permission.approvedBy && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved By:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">{selectedStudentModal.permission.approvedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attendance Status Badge */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Period {periodsKey || '—'} Status:</span>
                  {selectedStudentModal.hasPermission ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-amber-600" />
                      Present (Permission)
                    </span>
                  ) : selectedStudentModal.status === 'present' ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      Present
                    </span>
                  ) : selectedStudentModal.status === 'absent' ? (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-extrabold flex items-center gap-1">
                      <AlertCircle size={13} className="text-rose-600" />
                      Absent
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-extrabold">
                      Unmarked
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedStudentModal(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
