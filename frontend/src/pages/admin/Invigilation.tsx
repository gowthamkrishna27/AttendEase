import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Plus, Search, Trash2, Edit3, Clock,
  MapPin, X, Check, AlertCircle, Loader2,
  Calendar, Building, BookOpen, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import * as api from '../../lib/api';
import {
  formatKolkataDate,
  formatKolkataTime,
  toKolkataIsoString,
  fromIsoToKolkataInputs,
  DEPARTMENTS,
  getFacultyInitials
} from '../../lib/utils';

// Exam Type Badge helper
function ExamTypeBadge({ type }: { type: api.ExamType }) {
  const styles: Record<api.ExamType, { label: string; bg: string; text: string; border: string }> = {
    MID: { label: 'MID EXAM', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    SEM: { label: 'SEMESTER', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    LAB: { label: 'LAB EXAM', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    SUPPLEMENTARY: { label: 'SUPPLEMENTARY', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  const style = styles[type] || { label: type, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// Interface for duty form state
interface DutyFormState {
  id?: string;
  examType: api.ExamType;
  examName: string;
  subjectName: string;
  date: string;       // YYYY-MM-DD in IST
  startTime: string;  // HH:mm in IST
  endTime: string;    // HH:mm in IST
  blockName: string;
  roomNumber: string;
  assignedFaculty: Array<{
    facultyId: string;
    dutyType: string;
  }>;
}

const DEFAULT_FORM: DutyFormState = {
  examType: 'MID',
  examName: '',
  subjectName: '',
  date: '',
  startTime: '09:30',
  endTime: '12:30',
  blockName: '',
  roomNumber: '',
  assignedFaculty: [],
};

export default function AdminInvigilation() {
  const queryClient = useQueryClient();

  // ── Filters State ──────────────────────────────────────────────────────────
  const [search, setSearch]                 = useState('');
  const [filterExamType, setFilterExamType] = useState<string>('all');
  const [filterDept, setFilterDept]         = useState<string>('all');
  const [filterFacultyId, setFilterFacultyId] = useState<string>('all');
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | 'upcoming' | 'custom'>('all');
  const [filterDate, setFilterDate]         = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate]   = useState<string>('');

  // ── Modals & Dialogs State ────────────────────────────────────────────────
  const [showFormModal, setShowFormModal]   = useState(false);
  const [formState, setFormState]           = useState<DutyFormState>(DEFAULT_FORM);
  const [isEditing, setIsEditing]           = useState(false);
  const [formError, setFormError]           = useState<string | null>(null);

  // Faculty multi-select helper search within modal
  const [facultySearch, setFacultySearch]   = useState('');
  const [facultyPickerDept, setFacultyPickerDept] = useState('all');

  // Duty details viewing modal for multiple faculty roster
  const [viewingDuty, setViewingDuty]       = useState<api.InvigilationDuty | null>(null);

  // Delete confirmation modal state
  const [dutyToDelete, setDutyToDelete]     = useState<api.InvigilationDuty | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Data Fetching ─────────────────────────────────────────────────────────
  // Fetch real faculty users
  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const facultyUsers = useMemo(() => {
    return usersList.filter((u) => u.role === 'faculty' && u.isActive !== false);
  }, [usersList]);

  // Build query params for invigilation duties
  const queryParams = useMemo<api.InvigilationFilterParams>(() => {
    const params: api.InvigilationFilterParams = {};
    if (filterExamType !== 'all') {
      params.examType = filterExamType as api.ExamType;
    }
    if (filterDept !== 'all') {
      params.department = filterDept;
    }
    if (filterFacultyId !== 'all') {
      params.facultyId = filterFacultyId;
    }
    if (filterDatePreset === 'today') {
      const todayIST = fromIsoToKolkataInputs(new Date().toISOString()).date;
      params.date = todayIST;
    } else if (filterDatePreset === 'upcoming') {
      const todayIST = fromIsoToKolkataInputs(new Date().toISOString()).date;
      params.startDate = `${todayIST}T00:00:00.000Z`;
    } else if (filterDatePreset === 'custom') {
      if (filterDate) {
        params.date = filterDate;
      } else {
        if (filterStartDate) params.startDate = `${filterStartDate}T00:00:00.000Z`;
        if (filterEndDate) params.endDate = `${filterEndDate}T23:59:59.999Z`;
      }
    }
    return params;
  }, [filterExamType, filterDept, filterFacultyId, filterDatePreset, filterDate, filterStartDate, filterEndDate]);

  // Fetch duties
  const {
    data: dutiesData,
    isLoading: isDutiesLoading,
    isError: isDutiesError,
    error: dutiesFetchError,
    refetch: refetchDuties,
  } = useQuery({
    queryKey: ['admin-invigilation-duties', queryParams],
    queryFn: () => api.getInvigilationDuties(queryParams),
  });

  const dutiesList = dutiesData?.duties || [];

  // Client-side quick search filtering (exam name, subject, block, room, faculty)
  const filteredDuties = useMemo(() => {
    if (!search.trim()) return dutiesList;
    const q = search.toLowerCase().trim();
    return dutiesList.filter((duty) => {
      const matchExam = duty.examName.toLowerCase().includes(q);
      const matchSubj = duty.subjectName.toLowerCase().includes(q);
      const matchBlock = duty.blockName.toLowerCase().includes(q);
      const matchRoom = duty.roomNumber.toLowerCase().includes(q);
      const matchFaculty = duty.assignedFaculty.some(
        (f) => f.name.toLowerCase().includes(q) || f.userId.toLowerCase().includes(q) || f.department.toLowerCase().includes(q)
      );
      return matchExam || matchSubj || matchBlock || matchRoom || matchFaculty;
    });
  }, [dutiesList, search]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: api.CreateDutyPayload) => api.createInvigilationDuty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invigilation-duties'] });
      setShowFormModal(false);
      resetForm();
      showToast('Invigilation duty created successfully.');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create invigilation duty.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateDutyPayload }) =>
      api.updateInvigilationDuty(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invigilation-duties'] });
      setShowFormModal(false);
      resetForm();
      showToast('Invigilation duty updated successfully.');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update invigilation duty.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInvigilationDuty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invigilation-duties'] });
      setDutyToDelete(null);
      showToast('Invigilation duty deleted.');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete invigilation duty.', 'error');
    },
  });

  // ── Form Helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setIsEditing(false);
    setFormError(null);
    setFacultySearch('');
    setFacultyPickerDept('all');
  };

  const handleOpenCreate = () => {
    resetForm();
    const today = fromIsoToKolkataInputs(new Date().toISOString()).date;
    setFormState({
      ...DEFAULT_FORM,
      date: today,
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (duty: api.InvigilationDuty) => {
    resetForm();
    const startInputs = fromIsoToKolkataInputs(duty.startDateTime);
    const endInputs = fromIsoToKolkataInputs(duty.endDateTime);

    setFormState({
      id: duty.id,
      examType: duty.examType,
      examName: duty.examName,
      subjectName: duty.subjectName,
      date: startInputs.date,
      startTime: startInputs.time,
      endTime: endInputs.time,
      blockName: duty.blockName,
      roomNumber: duty.roomNumber,
      assignedFaculty: duty.assignedFaculty.map((f) => ({
        facultyId: f.facultyId,
        dutyType: f.dutyType || '',
      })),
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleToggleFaculty = (facultyId: string) => {
    setFormState((prev) => {
      const exists = prev.assignedFaculty.some((f) => f.facultyId === facultyId);
      if (exists) {
        return {
          ...prev,
          assignedFaculty: prev.assignedFaculty.filter((f) => f.facultyId !== facultyId),
        };
      } else {
        return {
          ...prev,
          assignedFaculty: [...prev.assignedFaculty, { facultyId, dutyType: 'Room Invigilator' }],
        };
      }
    });
  };

  const handleUpdateDutyType = (facultyId: string, dutyType: string) => {
    setFormState((prev) => ({
      ...prev,
      assignedFaculty: prev.assignedFaculty.map((f) =>
        f.facultyId === facultyId ? { ...f, dutyType } : f
      ),
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form validation
    if (!formState.examName.trim()) {
      setFormError('Please enter an exam name.');
      return;
    }
    if (!formState.subjectName.trim()) {
      setFormError('Please enter a subject name.');
      return;
    }
    if (!formState.date.trim()) {
      setFormError('Please select a date.');
      return;
    }
    if (!formState.startTime.trim() || !formState.endTime.trim()) {
      setFormError('Please specify start and end times.');
      return;
    }
    if (!formState.blockName.trim()) {
      setFormError('Please enter a block name.');
      return;
    }
    if (!formState.roomNumber.trim()) {
      setFormError('Please enter a room / hall number.');
      return;
    }
    if (formState.assignedFaculty.length === 0) {
      setFormError('Please assign at least one faculty member.');
      return;
    }

    // Convert local Asia/Kolkata date & time to ISO strings
    let startIso = '';
    let endIso = '';
    try {
      startIso = toKolkataIsoString(formState.date, formState.startTime);
      endIso = toKolkataIsoString(formState.date, formState.endTime);
    } catch {
      setFormError('Invalid date or time format entered.');
      return;
    }

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError('End time must be strictly after start time.');
      return;
    }

    const payload: api.CreateDutyPayload = {
      examType: formState.examType,
      examName: formState.examName.trim(),
      subjectName: formState.subjectName.trim(),
      startDateTime: startIso,
      endDateTime: endIso,
      blockName: formState.blockName.trim(),
      roomNumber: formState.roomNumber.trim(),
      assignedFaculty: formState.assignedFaculty.map((f) => ({
        facultyId: f.facultyId,
        dutyType: f.dutyType?.trim() || null,
      })),
    };

    if (isEditing && formState.id) {
      updateMutation.mutate({ id: formState.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtered faculty list inside modal picker
  const pickerFacultyList = useMemo(() => {
    let list = facultyUsers;
    if (facultyPickerDept !== 'all') {
      list = list.filter((f) => f.department?.toLowerCase() === facultyPickerDept.toLowerCase());
    }
    if (facultySearch.trim()) {
      const q = facultySearch.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name?.toLowerCase().includes(q) ||
          f.userId?.toLowerCase().includes(q) ||
          f.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [facultyUsers, facultyPickerDept, facultySearch]);

  const activeFiltersCount =
    (filterExamType !== 'all' ? 1 : 0) +
    (filterDept !== 'all' ? 1 : 0) +
    (filterFacultyId !== 'all' ? 1 : 0) +
    (filterDatePreset !== 'all' ? 1 : 0);

  const resetAllFilters = () => {
    setSearch('');
    setFilterExamType('all');
    setFilterDept('all');
    setFilterFacultyId('all');
    setFilterDatePreset('all');
    setFilterDate('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <PageWrapper role="admin">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Toast Notification Banner ── */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-lg border text-sm flex items-center justify-between shadow-xs ${
                toastMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                <span>{toastMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
                ADMINISTRATION
              </span>
              <span className="text-[12px] text-[#6b7280]">SRKR Engineering College</span>
            </div>
            <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight flex items-center gap-2.5">
              <CalendarCheck size={22} className="text-[#EA580C]" />
              <span>Invigilation Management</span>
            </h1>
            <p className="text-[13px] text-[#6b7280] mt-0.5">
              Schedule, track, and manage faculty exam invigilation duties with Asia/Kolkata timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenCreate}
              className="h-[38px] px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[13px] font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus size={16} />
              <span>Add Invigilation Duty</span>
            </button>
          </div>
        </div>

        {/* ── Metric Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-[#6b7280] font-medium uppercase tracking-wider">Total Duties</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {dutiesList.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-blue-700 font-medium uppercase tracking-wider">Mid Exams</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {dutiesList.filter((d) => d.examType === 'MID').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-emerald-700 font-medium uppercase tracking-wider">Semester Exams</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {dutiesList.filter((d) => d.examType === 'SEM').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-[#6b7280] font-medium uppercase tracking-wider">Faculty Available</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {facultyUsers.length}
            </p>
          </div>
        </div>

        {/* ── Filters & Search Toolbar ── */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by exam, subject, room, block, or faculty name..."
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Exam Type */}
              <select
                value={filterExamType}
                onChange={(e) => setFilterExamType(e.target.value)}
                className="h-9 px-3 text-[12.5px] font-medium bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 text-slate-700 cursor-pointer"
              >
                <option value="all">All Exam Types</option>
                <option value="MID">MID</option>
                <option value="SEM">SEM</option>
                <option value="LAB">LAB</option>
                <option value="SUPPLEMENTARY">SUPPLEMENTARY</option>
              </select>

              {/* Department (Assigned Faculty Department) */}
              <div className="relative group">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="h-9 px-3 text-[12.5px] font-medium bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 text-slate-700 cursor-pointer"
                  title="Filter duties where assigned faculty belong to department"
                >
                  <option value="all">All Faculty Depts</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      Dept: {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Member Selector */}
              <select
                value={filterFacultyId}
                onChange={(e) => setFilterFacultyId(e.target.value)}
                className="h-9 px-3 text-[12.5px] font-medium bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 text-slate-700 max-w-[180px] truncate cursor-pointer"
              >
                <option value="all">All Faculty Members</option>
                {facultyUsers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department})
                  </option>
                ))}
              </select>

              {/* Date Presets */}
              <select
                value={filterDatePreset}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFilterDatePreset(val);
                  if (val !== 'custom') {
                    setFilterDate('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }
                }}
                className="h-9 px-3 text-[12.5px] font-medium bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 text-slate-700 cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today (IST)</option>
                <option value="upcoming">Upcoming</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {/* Reset button */}
              {(activeFiltersCount > 0 || search) && (
                <button
                  onClick={resetAllFilters}
                  className="h-9 px-3 text-[12px] font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Department note & custom date row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[12px] text-slate-500">
            <div className="flex items-center gap-1 text-[11.5px] text-slate-500">
              <Info size={13} className="text-slate-400 shrink-0" />
              <span>Department filter filters duties by assigned faculty member department (CSD / CSIT).</span>
            </div>

            {filterDatePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-600 font-medium">From:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="h-7 px-2 text-[12px] bg-slate-50 border border-slate-200 rounded text-slate-700"
                />
                <span className="text-[11.5px] text-slate-600 font-medium">To:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="h-7 px-2 text-[12px] bg-slate-50 border border-slate-200 rounded text-slate-700"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Error Banner if API error ── */}
        {isDutiesError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={17} />
              <span>
                {dutiesFetchError instanceof Error
                  ? dutiesFetchError.message
                  : 'Failed to load invigilation duties from server.'}
              </span>
            </div>
            <button
              onClick={() => refetchDuties()}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-medium text-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Main Duties Table / Cards View ── */}
        {isDutiesLoading ? (
          <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-[#EA580C]" />
            <p className="text-[13px] text-slate-500 font-medium">Loading invigilation schedules...</p>
          </div>
        ) : filteredDuties.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200/80">
            <EmptyState
              title="No Invigilation Duties Found"
              description={
                activeFiltersCount > 0 || search
                  ? 'No exam invigilation duties matched your selected filter criteria. Try resetting filters.'
                  : 'No invigilation duties have been scheduled yet. Click "Add Invigilation Duty" to create your first schedule.'
              }
              actionLabel={activeFiltersCount > 0 || search ? 'Clear Filters' : 'Add Invigilation Duty'}
              onAction={activeFiltersCount > 0 || search ? resetAllFilters : handleOpenCreate}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Exam Info</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Date & Time (IST)</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Assigned Faculty</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
                  {filteredDuties.map((duty) => {
                    const dateStr = formatKolkataDate(duty.startDateTime);
                    const startStr = formatKolkataTime(duty.startDateTime);
                    const endStr = formatKolkataTime(duty.endDateTime);

                    return (
                      <tr key={duty.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* Exam Type & Name */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-col items-start gap-1">
                            <ExamTypeBadge type={duty.examType} />
                            <span className="font-semibold text-slate-900 leading-snug">
                              {duty.examName}
                            </span>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <BookOpen size={14} className="text-slate-400 shrink-0" />
                            <span>{duty.subjectName}</span>
                          </div>
                        </td>

                        {/* Date & Time (IST) */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[12px]">
                              <Clock size={13} className="text-slate-400 shrink-0" />
                              <span>{startStr} – {endStr}</span>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                              <Building size={13} className="text-slate-400 shrink-0" />
                              <span>{duty.blockName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[12px]">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <span>Room {duty.roomNumber}</span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Faculty */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                            {duty.assignedFaculty.slice(0, 2).map((fac) => (
                              <span
                                key={fac.assignmentId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11.5px] border border-slate-200"
                                title={`${fac.name} (${fac.userId}) - ${fac.department} ${fac.dutyType ? `• ${fac.dutyType}` : ''}`}
                              >
                                <span className="font-medium text-slate-900">{fac.name}</span>
                                <span className="text-[10px] text-slate-500 bg-white px-1 rounded border border-slate-200 font-mono">
                                  {fac.department}
                                </span>
                              </span>
                            ))}

                            {duty.assignedFaculty.length > 2 && (
                              <button
                                onClick={() => setViewingDuty(duty)}
                                className="text-[11.5px] font-semibold text-[#EA580C] hover:text-[#c2410c] bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200 transition-colors cursor-pointer"
                              >
                                +{duty.assignedFaculty.length - 2} more
                              </button>
                            )}

                            {duty.assignedFaculty.length === 0 && (
                              <span className="text-[12px] text-slate-400 italic">No faculty assigned</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(duty)}
                              title="Edit duty schedule"
                              className="w-7 h-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setDutyToDelete(duty)}
                              title="Delete duty"
                              className="w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDuties.map((duty) => {
                const dateStr = formatKolkataDate(duty.startDateTime);
                const startStr = formatKolkataTime(duty.startDateTime);
                const endStr = formatKolkataTime(duty.endDateTime);

                return (
                  <div key={duty.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1">
                          <ExamTypeBadge type={duty.examType} />
                        </div>
                        <h3 className="font-semibold text-slate-900 text-[14.5px]">{duty.examName}</h3>
                        <p className="text-[13px] text-slate-600 font-medium">{duty.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(duty)}
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDutyToDelete(duty)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[12.5px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Date & Time (IST)</span>
                        <span className="font-medium text-slate-800">{dateStr}</span>
                        <span className="text-slate-500 block text-[11.5px]">{startStr} – {endStr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Location</span>
                        <span className="font-medium text-slate-800">{duty.blockName}</span>
                        <span className="text-slate-500 block text-[11.5px]">Room {duty.roomNumber}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Assigned Faculty ({duty.assignedFaculty.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {duty.assignedFaculty.map((fac) => (
                          <span
                            key={fac.assignmentId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11.5px] border border-slate-200"
                          >
                            <span>{fac.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">[{fac.department}]</span>
                            {fac.dutyType && (
                              <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                                {fac.dutyType}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Create / Edit Duty Modal ── */}
        <Modal
          open={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            resetForm();
          }}
          title={isEditing ? 'Edit Invigilation Duty' : 'Add New Invigilation Duty'}
          description="Configure exam details, timings (Asia/Kolkata), location, and assign faculty members."
          size="lg"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Row 1: Exam Type & Exam Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formState.examType}
                  onChange={(e) => setFormState({ ...formState, examType: e.target.value as api.ExamType })}
                  className="w-full h-9 px-3 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="MID">MID</option>
                  <option value="SEM">SEM</option>
                  <option value="LAB">LAB</option>
                  <option value="SUPPLEMENTARY">SUPPLEMENTARY</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Exam Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.examName}
                  onChange={(e) => setFormState({ ...formState, examName: e.target.value })}
                  placeholder="e.g. B.Tech III-II Mid-1 Examination"
                  className="w-full h-9 px-3 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Row 2: Subject Name */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formState.subjectName}
                onChange={(e) => setFormState({ ...formState, subjectName: e.target.value })}
                placeholder="e.g. Cloud Computing & Distributed Systems"
                className="w-full h-9 px-3 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Row 3: Date, Start Time, End Time (in Asia/Kolkata) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Date (IST) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formState.date}
                  onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                  className="w-full h-9 px-2.5 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Start Time (IST) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formState.startTime}
                  onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                  className="w-full h-9 px-2.5 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  End Time (IST) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formState.endTime}
                  onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                  className="w-full h-9 px-2.5 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Row 4: Location (Block Name, Room Number) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Block Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.blockName}
                  onChange={(e) => setFormState({ ...formState, blockName: e.target.value })}
                  placeholder="e.g. Mechanical Block / PG Block"
                  className="w-full h-9 px-3 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Room / Hall Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.roomNumber}
                  onChange={(e) => setFormState({ ...formState, roomNumber: e.target.value })}
                  placeholder="e.g. MB-204 / LH-1"
                  className="w-full h-9 px-3 text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Row 5: Assigned Faculty Multi-Picker */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-[12px] font-semibold text-slate-700">
                  Assign Faculty Members <span className="text-red-500">*</span>
                  <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                    ({formState.assignedFaculty.length} selected)
                  </span>
                </label>
              </div>

              {/* Faculty search & department filter inside modal */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    placeholder="Search faculty by name, ID, department..."
                    className="w-full h-8 pl-8 pr-2 text-[12px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-800"
                  />
                </div>
                <select
                  value={facultyPickerDept}
                  onChange={(e) => setFacultyPickerDept(e.target.value)}
                  className="h-8 px-2 text-[11.5px] bg-slate-50 border border-slate-200 rounded-md text-slate-700 cursor-pointer"
                >
                  <option value="all">All Depts</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Scrollable list of faculty with checkmarks */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                {facultyUsers.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No faculty available
                  </div>
                ) : pickerFacultyList.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No faculty found matching the search.
                  </div>
                ) : (
                  pickerFacultyList.map((fac) => {
                    const isSelected = formState.assignedFaculty.some((f) => f.facultyId === fac.id);
                    const selectedItem = formState.assignedFaculty.find((f) => f.facultyId === fac.id);

                    return (
                      <div
                        key={fac.id}
                        className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                          isSelected ? 'bg-orange-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          onClick={() => handleToggleFaculty(fac.id)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#EA580C] border-[#EA580C] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 font-bold text-[11px] flex items-center justify-center shrink-0 overflow-hidden border border-orange-200/60">
                            {fac.avatarUrl ? (
                              <img
                                src={fac.avatarUrl}
                                alt={fac.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerText = getFacultyInitials(fac.name);
                                  }
                                }}
                              />
                            ) : (
                              getFacultyInitials(fac.name)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 block truncate text-[13px]">{fac.name}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="text"
                              value={selectedItem?.dutyType || ''}
                              onChange={(e) => handleUpdateDutyType(fac.id, e.target.value)}
                              placeholder="Duty role (optional)"
                              className="h-7 w-32 px-2 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                              title="e.g. Chief Superintendent, Room Invigilator, Reliever"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                className="h-9 px-4 text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-9 px-5 text-[13px] font-medium text-white bg-[#18181b] hover:bg-[#27272a] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <span>{isEditing ? 'Save Changes' : 'Create Duty'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── View Full Faculty Roster Modal ── */}
        <Modal
          open={Boolean(viewingDuty)}
          onClose={() => setViewingDuty(null)}
          title="Assigned Faculty Roster"
          description={viewingDuty ? `${viewingDuty.examName} • ${viewingDuty.subjectName}` : ''}
          size="md"
        >
          {viewingDuty && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p><span className="font-semibold text-slate-700">Date:</span> {formatKolkataDate(viewingDuty.startDateTime)}</p>
                <p><span className="font-semibold text-slate-700">Time (IST):</span> {formatKolkataTime(viewingDuty.startDateTime)} – {formatKolkataTime(viewingDuty.endDateTime)}</p>
                <p><span className="font-semibold text-slate-700">Location:</span> {viewingDuty.blockName}, Room {viewingDuty.roomNumber}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Faculty Members ({viewingDuty.assignedFaculty.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                  {viewingDuty.assignedFaculty.map((fac) => (
                    <div key={fac.assignmentId} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{fac.name}</p>
                        <p className="text-slate-500 text-[11px]">ID: {fac.userId} • Dept: {fac.department}</p>
                      </div>
                      {fac.dutyType ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200">
                          {fac.dutyType}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Invigilator</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingDuty(null)}
                  className="h-8 px-4 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Delete Confirmation Dialog ── */}
        <Modal
          open={Boolean(dutyToDelete)}
          onClose={() => setDutyToDelete(null)}
          title="Confirm Duty Deletion"
          description="Are you sure you want to delete this invigilation duty?"
          size="sm"
        >
          {dutyToDelete && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-lg text-xs space-y-1 text-slate-800">
                <p className="font-semibold text-slate-900 text-sm">{dutyToDelete.examName}</p>
                <p><span className="text-slate-500">Subject:</span> {dutyToDelete.subjectName}</p>
                <p><span className="text-slate-500">Date:</span> {formatKolkataDate(dutyToDelete.startDateTime)}</p>
                <p><span className="text-slate-500">Location:</span> {dutyToDelete.blockName}, Room {dutyToDelete.roomNumber}</p>
                <p><span className="text-slate-500">Assigned Faculty:</span> {dutyToDelete.assignedFaculty.length} member(s)</p>
              </div>

              <p className="text-[12px] text-slate-500">
                This will delete the duty schedule and its assignment mapping. Faculty user records will not be deleted.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDutyToDelete(null)}
                  className="h-8 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(dutyToDelete.id)}
                  className="h-8 px-4 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>Delete Duty</span>
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </PageWrapper>
  );
}
