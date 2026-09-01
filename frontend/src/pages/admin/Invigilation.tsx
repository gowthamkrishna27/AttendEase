import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Plus, Search, Trash2, Edit3, Clock,
  X, Check, AlertCircle, Loader2,
  Calendar, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import * as api from '../../lib/api';
import { DEPARTMENTS, getFacultyInitials } from '../../lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDisplayDate(date: string): string {
  // date is YYYY-MM-DD
  try {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(Date.UTC(year!, month! - 1, day!));
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return date;
  }
}

function ExamTypeBadge({ type }: { type: api.ExamType }) {
  const styles: Record<api.ExamType, { label: string; bg: string; text: string; border: string }> = {
    MID:           { label: 'MID EXAM',       bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    SEM:           { label: 'SEMESTER',        bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
    LAB:           { label: 'LAB EXAM',        bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    SUPPLEMENTARY: { label: 'SUPPLEMENTARY',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  };
  const style = styles[type] || { label: type, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

function SessionBadge({ session }: { session: api.SessionType }) {
  const styles: Record<api.SessionType, { label: string; bg: string; text: string; border: string }> = {
    MORNING:   { label: 'Morning',   bg: 'bg-amber-50/80',  text: 'text-amber-800',  border: 'border-amber-200/80' },
    AFTERNOON: { label: 'Afternoon', bg: 'bg-orange-50/80', text: 'text-orange-800', border: 'border-orange-200/80' },
  };
  const style = styles[session] || { label: session, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// ── Form State ─────────────────────────────────────────────────────────────────

interface DutyFormState {
  id?: string;
  examType: api.ExamType;
  date: string;
  session: api.SessionType;
  startTime: string;   // HH:mm or ''
  endTime: string;     // HH:mm or ''
  assignedFaculty: string[];  // array of User.id (cuid)
}

const DEFAULT_FORM: DutyFormState = {
  examType: 'MID',
  date: '',
  session: 'MORNING',
  startTime: '',
  endTime: '',
  assignedFaculty: [],
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminInvigilation() {
  const queryClient = useQueryClient();

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [filterExamType, setFilterExamType] = useState<string>('all');
  const [filterSession, setFilterSession]   = useState<string>('all');
  const [filterFacultyId, setFilterFacultyId] = useState<string>('all');
  const [filterDate, setFilterDate]         = useState<string>('');

  // ── Modal State ───────────────────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false);
  const [formState, setFormState]         = useState<DutyFormState>(DEFAULT_FORM);
  const [isEditing, setIsEditing]         = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);

  const [facultySearch, setFacultySearch]   = useState('');
  const [facultyPickerDept, setFacultyPickerDept] = useState('all');

  const [viewingDuty, setViewingDuty]   = useState<api.InvigilationDuty | null>(null);
  const [dutyToDelete, setDutyToDelete] = useState<api.InvigilationDuty | null>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const facultyUsers = useMemo(() => {
    return usersList.filter((u) => u.role === 'faculty');
  }, [usersList]);

  const queryParams = useMemo<api.InvigilationFilterParams>(() => {
    const params: api.InvigilationFilterParams = {};
    if (filterExamType !== 'all') params.examType = filterExamType as api.ExamType;
    if (filterSession !== 'all') params.session = filterSession as api.SessionType;
    if (filterFacultyId !== 'all') params.facultyId = filterFacultyId;
    if (filterDate) params.date = filterDate;
    return params;
  }, [filterExamType, filterSession, filterFacultyId, filterDate]);

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

  const filteredDuties = useMemo(() => {
    if (!search.trim()) return dutiesList;
    const q = search.toLowerCase().trim();
    return dutiesList.filter((duty) => {
      const matchType = duty.examType.toLowerCase().includes(q);
      const matchDate = duty.date.includes(q);
      const matchSession = duty.session.toLowerCase().includes(q);
      const matchFaculty = duty.assignedFaculty.some(
        (f) => f.name.toLowerCase().includes(q) || f.userId.toLowerCase().includes(q) || f.department.toLowerCase().includes(q)
      );
      return matchType || matchDate || matchSession || matchFaculty;
    });
  }, [dutiesList, search]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
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

  // ── Form Helpers ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setIsEditing(false);
    setFormError(null);
    setFacultySearch('');
    setFacultyPickerDept('all');
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormState({ ...DEFAULT_FORM, date: todayIST() });
    setShowFormModal(true);
  };

  const handleOpenEdit = (duty: api.InvigilationDuty) => {
    resetForm();
    setFormState({
      id: duty.id,
      examType: duty.examType,
      date: duty.date,
      session: duty.session,
      startTime: duty.startTime ?? '',
      endTime: duty.endTime ?? '',
      assignedFaculty: duty.assignedFaculty.map((f) => f.facultyId),
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleToggleFaculty = (facultyId: string) => {
    setFormState((prev) => {
      const exists = prev.assignedFaculty.includes(facultyId);
      return {
        ...prev,
        assignedFaculty: exists
          ? prev.assignedFaculty.filter((id) => id !== facultyId)
          : [...prev.assignedFaculty, facultyId],
      };
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formState.date.trim()) {
      setFormError('Please select a date.');
      return;
    }
    if (!formState.session) {
      setFormError('Please select a session (Morning or Afternoon).');
      return;
    }
    if (formState.assignedFaculty.length === 0) {
      setFormError('Please assign at least one faculty member.');
      return;
    }

    // Validate time range if both provided
    if (formState.startTime && formState.endTime && formState.endTime <= formState.startTime) {
      setFormError('End time must be after start time.');
      return;
    }

    const payload: api.CreateDutyPayload = {
      examType: formState.examType,
      date: formState.date,
      session: formState.session,
      startTime: formState.startTime || null,
      endTime: formState.endTime || null,
      assignedFaculty: formState.assignedFaculty.map((id) => ({ facultyId: id })),
    };

    if (isEditing && formState.id) {
      updateMutation.mutate({ id: formState.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

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

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const resetAllFilters = () => {
    setSearch('');
    setFilterExamType('all');
    setFilterSession('all');
    setFilterFacultyId('all');
    setFilterDate('');
  };

  const activeFiltersCount =
    (filterExamType !== 'all' ? 1 : 0) +
    (filterSession !== 'all' ? 1 : 0) +
    (filterFacultyId !== 'all' ? 1 : 0) +
    (filterDate ? 1 : 0);

  return (
    <PageWrapper role="admin">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Toast ── */}
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
              <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
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
              Schedule and manage faculty exam invigilation duties.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="h-[38px] px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[13px] font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus size={16} />
            <span>Add Invigilation Duty</span>
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-[#6b7280] font-medium uppercase tracking-wider">Total Duties</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">{dutiesList.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-blue-700 font-medium uppercase tracking-wider">MID Exams</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {dutiesList.filter((d) => d.examType === 'MID').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-emerald-700 font-medium uppercase tracking-wider">SEM Exams</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">
              {dutiesList.filter((d) => d.examType === 'SEM').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11.5px] text-[#6b7280] font-medium uppercase tracking-wider">Faculty Available</p>
            <p className="text-[24px] font-bold text-[#18181b] tracking-tight mt-0.5">{facultyUsers.length}</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by exam type, session, date, or faculty name..."
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-2">
              {/* Exam Type */}
              <select
                value={filterExamType}
                onChange={(e) => setFilterExamType(e.target.value)}
                className="h-9 px-2.5 text-[12.5px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700"
              >
                <option value="all">All Exam Types</option>
                <option value="MID">MID</option>
                <option value="SEM">SEM</option>
                <option value="LAB">LAB</option>
                <option value="SUPPLEMENTARY">SUPPLEMENTARY</option>
              </select>

              {/* Session */}
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="h-9 px-2.5 text-[12.5px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700"
              >
                <option value="all">All Sessions</option>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
              </select>

              {/* Faculty Filter */}
              <select
                value={filterFacultyId}
                onChange={(e) => setFilterFacultyId(e.target.value)}
                className="h-9 px-2.5 text-[12.5px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700"
              >
                <option value="all">All Faculty</option>
                {facultyUsers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 px-2.5 text-[12.5px] bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700"
              />

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="h-9 px-3 text-[12px] text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={12} />
                  Clear ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── List ── */}
        {isDutiesLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200/80">
            <Loader2 size={24} className="animate-spin text-[#EA580C]" />
            <span className="text-[13px] text-slate-500">Loading invigilation duties...</span>
          </div>
        ) : isDutiesError ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200/80 text-center">
            <AlertCircle size={20} className="text-red-500" />
            <div>
              <p className="text-[13.5px] font-medium text-red-700">Failed to load invigilation duties.</p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {dutiesFetchError instanceof Error ? dutiesFetchError.message : 'Unknown error'}
              </p>
            </div>
            <button
              onClick={() => refetchDuties()}
              className="mt-1 px-4 py-1.5 text-[12.5px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredDuties.length === 0 ? (
          <EmptyState
            title="No invigilation duties found"
            description={
              search || activeFiltersCount > 0
                ? 'Try clearing your filters or search.'
                : 'Click "Add Invigilation Duty" to create the first one.'
            }
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredDuties.map((duty) => (
                <motion.div
                  key={duty.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Exam type, date, session, times */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExamTypeBadge type={duty.examType} />
                        <SessionBadge session={duty.session} />
                      </div>

                      <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>{formatDisplayDate(duty.date)}</span>
                      </div>

                      {(duty.startTime || duty.endTime) && (
                        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>
                            {duty.startTime && duty.endTime
                              ? `${duty.startTime} – ${duty.endTime}`
                              : duty.startTime
                              ? `From ${duty.startTime}`
                              : `Until ${duty.endTime}`}
                          </span>
                        </div>
                      )}

                      {/* Faculty roster preview */}
                      {duty.assignedFaculty.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {duty.assignedFaculty.slice(0, 4).map((f) => (
                            <span
                              key={f.facultyId}
                              title={`${f.name} (${f.department})`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11.5px] rounded font-medium border border-slate-200"
                            >
                              <span className="w-5 h-5 rounded-full bg-[#EA580C]/10 text-[#EA580C] text-[10px] font-bold flex items-center justify-center shrink-0">
                                {getFacultyInitials(f.name)}
                              </span>
                              <span>{f.name}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500 text-[10.5px]">{f.department}</span>
                            </span>
                          ))}
                          {duty.assignedFaculty.length > 4 && (
                            <button
                              onClick={() => setViewingDuty(duty)}
                              className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-600 text-[11.5px] rounded border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              +{duty.assignedFaculty.length - 4} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {duty.assignedFaculty.length > 4 && (
                        <button
                          onClick={() => setViewingDuty(duty)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                          title="View full faculty roster"
                        >
                          <Info size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(duty)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                        title="Edit duty"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDutyToDelete(duty)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                        title="Delete duty"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); resetForm(); }}
        title={isEditing ? 'Edit Invigilation Duty' : 'Add New Invigilation Duty'}
        description={isEditing ? 'Update the exam session details and faculty assignment.' : 'Configure the exam session and assign faculty.'}
      >
        <form onSubmit={handleSubmitForm}>

          {/* ── Exam Type + Session ── */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Exam Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formState.examType}
                onChange={(e) => setFormState((p) => ({ ...p, examType: e.target.value as api.ExamType }))}
                className="w-full h-[38px] px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-slate-800 transition-all"
              >
                <option value="MID">MID</option>
                <option value="SEM">SEM</option>
                <option value="LAB">LAB</option>
                <option value="SUPPLEMENTARY">SUPPLEMENTARY</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Session <span className="text-red-400">*</span>
              </label>
              <select
                value={formState.session}
                onChange={(e) => setFormState((p) => ({ ...p, session: e.target.value as api.SessionType }))}
                className="w-full h-[38px] px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-slate-800 transition-all"
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
              </select>
            </div>
          </div>

          {/* ── Date ── */}
          <div className="mb-5">
            <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formState.date}
              onChange={(e) => setFormState((p) => ({ ...p, date: e.target.value }))}
              required
              className="w-full h-[38px] px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-slate-800 transition-all"
            />
          </div>

          {/* ── Start Time + End Time ── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Start Time{' '}
                <span className="normal-case font-normal tracking-normal text-slate-400">optional</span>
              </label>
              <input
                type="time"
                value={formState.startTime}
                onChange={(e) => setFormState((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full h-[38px] px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-slate-700 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                End Time{' '}
                <span className="normal-case font-normal tracking-normal text-slate-400">optional</span>
              </label>
              <input
                type="time"
                value={formState.endTime}
                onChange={(e) => setFormState((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full h-[38px] px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-slate-700 transition-all"
              />
            </div>
          </div>

          {/* ── Faculty Picker ── */}
          <div className="mb-5">
            {/* Section header */}
            <div className="flex items-baseline justify-between mb-2">
              <label className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                Assigned Faculty <span className="text-red-400">*</span>
              </label>
              {formState.assignedFaculty.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {formState.assignedFaculty.length} selected
                </span>
              )}
            </div>

            {/* Search + Dept filter */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty..."
                  className="w-full h-[34px] pl-8 pr-3 text-[12.5px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400 transition-all"
                />
              </div>
              <select
                value={facultyPickerDept}
                onChange={(e) => setFacultyPickerDept(e.target.value)}
                className="h-[34px] px-2.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700 shrink-0"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Faculty list */}
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100/80 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {pickerFacultyList.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-slate-400">No faculty found.</div>
              ) : (
                pickerFacultyList.map((f) => {
                  const isSelected = formState.assignedFaculty.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleToggleFaculty(f.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-50/80 border-l-2 border-l-[#EA580C]'
                          : 'hover:bg-slate-50/60 border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#EA580C] border-[#EA580C]'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      {/* Faculty info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-medium truncate leading-tight ${
                          isSelected ? 'text-slate-900' : 'text-slate-800'
                        }`}>
                          {f.name}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{f.department}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Error ── */}
          {formError && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200/80 rounded-lg flex items-center gap-2 text-[12.5px] text-red-700">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex justify-end items-center gap-2.5 pt-1 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={() => { setShowFormModal(false); resetForm(); }}
              className="h-[36px] px-4 text-[13px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="h-[36px] px-5 text-[13px] font-medium text-white bg-[#18181b] hover:bg-[#27272a] rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isMutating && <Loader2 size={13} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Duty'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Full Faculty Roster Modal ── */}
      <Modal
        isOpen={!!viewingDuty}
        onClose={() => setViewingDuty(null)}
        title="Assigned Faculty Roster"
      >
        {viewingDuty && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ExamTypeBadge type={viewingDuty.examType} />
              <SessionBadge session={viewingDuty.session} />
              <span className="text-[13px] font-semibold text-slate-700">{formatDisplayDate(viewingDuty.date)}</span>
            </div>
            <div className="space-y-2">
              {viewingDuty.assignedFaculty.map((f, idx) => (
                <div key={f.facultyId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 w-5 text-center">{idx + 1}.</span>
                  <div className="w-8 h-8 rounded-full bg-[#EA580C]/10 text-[#EA580C] text-[12px] font-bold flex items-center justify-center shrink-0">
                    {getFacultyInitials(f.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{f.name}</p>
                    <p className="text-[11.5px] text-slate-500">{f.department} · {f.userId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={!!dutyToDelete}
        onClose={() => setDutyToDelete(null)}
        title="Delete Invigilation Duty"
      >
        {dutyToDelete && (
          <div className="space-y-4">
            <p className="text-[13.5px] text-slate-600">
              Are you sure you want to delete this{' '}
              <span className="font-semibold text-slate-800">{dutyToDelete.examType}</span> invigilation duty
              on <span className="font-semibold text-slate-800">{formatDisplayDate(dutyToDelete.date)}</span> ({dutyToDelete.session.toLowerCase()})?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDutyToDelete(null)}
                className="h-9 px-4 text-[13px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(dutyToDelete.id)}
                disabled={deleteMutation.isPending}
                className="h-9 px-5 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
