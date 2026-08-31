import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  CalendarDays,
  Clock,
  FileText,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  INVIGILATION_BRANCHES,
  INVIGILATION_TYPES,
  createInvigilationAssignment,
  deleteInvigilationAssignment,
  formatDate,
  listInvigilationAssignments,
  listInvigilationFaculty,
  todayIso,
  type AssignmentInput,
  type InvigilationAssignment,
  type InvigilationBranch,
  type InvigilationFaculty,
  type InvigilationType,
} from '../../lib/invigilationApi';

export default function AdminInvigilation() {
  const [assignments, setAssignments] = useState<InvigilationAssignment[]>([]);
  const [faculty, setFaculty] = useState<InvigilationFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<'all' | InvigilationBranch>('all');
  const [filterType, setFilterType] = useState<'all' | InvigilationType>('all');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ open: boolean; target: InvigilationAssignment | null }>({ open: false, target: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formFacultyId, setFormFacultyId] = useState<string>('');
  const [formBranch, setFormBranch] = useState<InvigilationBranch>('CSD');
  const [formType, setFormType] = useState<InvigilationType>('MID');
  const [formOtherDuty, setFormOtherDuty] = useState('');
  const [formDate, setFormDate] = useState<string>(todayIso());
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formRoomNo, setFormRoomNo] = useState('');
  const [formBlock, setFormBlock] = useState('');

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, facultyList] = await Promise.all([
        listInvigilationAssignments(),
        listInvigilationFaculty(),
      ]);
      setAssignments(list);
      setFaculty(facultyList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invigilation records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // ── Faculty lookup helpers ────────────────────────────────────────────────
  const facultyById = useMemo(() => {
    const map = new Map<string, InvigilationFaculty>();
    faculty.forEach(f => map.set(f.id, f));
    return map;
  }, [faculty]);

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter(a => {
        if (filterBranch !== 'all' && a.branch !== filterBranch) return false;
        if (filterType !== 'all' && a.type !== filterType) return false;
        if (!q) return true;
        const meta = facultyById.get(a.facultyId);
        return (
          a.facultyName.toLowerCase().includes(q) ||
          a.branch.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          (a.otherDutyDescription || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  }, [assignments, search, filterBranch, filterType, facultyById]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function resetForm() {
    setFormFacultyId('');
    setFormBranch('CSD');
    setFormType('MID');
    setFormOtherDuty('');
    setFormDate(todayIso());
    setFormStartTime('09:00');
    setFormEndTime('12:00');
    setFormRoomNo('');
    setFormBlock('');
    setFormError(null);
  }

  function openAddModal() {
    resetForm();
    setShowFormModal(true);
  }

  function closeAddModal() {
    if (submitting) return;
    setShowFormModal(false);
    setFormError(null);
  }

  // Filter the faculty list shown in the dropdown by the selected branch
  const availableFaculty = useMemo(
    () => faculty.filter(f => !f.branch || f.branch === formBranch),
    [faculty, formBranch]
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Frontend validation
    if (!formFacultyId) {
      setFormError('Please choose a faculty member.');
      return;
    }
    if (!formDate) {
      setFormError('Date is required.');
      return;
    }
    if (!formStartTime || !formEndTime) {
      setFormError('Start and end times are required.');
      return;
    }
    if (formEndTime <= formStartTime) {
      setFormError('End time must be after start time.');
      return;
    }
    if (formType === 'Other Duties' && !formOtherDuty.trim()) {
      setFormError('Please describe the other duty.');
      return;
    }

    const facultyMember = facultyById.get(formFacultyId);
    if (!facultyMember) {
      setFormError('Selected faculty member could not be resolved.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const input: AssignmentInput = {
      facultyId: facultyMember.id,
      branch: formBranch,
      type: formType,
      otherDutyDescription: formType === 'Other Duties' ? formOtherDuty.trim() : undefined,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      roomNo: formRoomNo.trim() || undefined,
      block: formBlock.trim() || undefined,
    };

    try {
      const created = await createInvigilationAssignment(input);
      // Prepend immediately so the user sees the row without a refetch
      setAssignments(prev => [created, ...prev]);
      setShowFormModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to assign invigilation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const target = showDeleteModal.target;
    if (!target || deleting) return;
    setDeleting(true);
    try {
      const ok = await deleteInvigilationAssignment(target.id);
      if (ok) {
        setAssignments(prev => prev.filter(a => a.id !== target.id));
      }
      setShowDeleteModal({ open: false, target: null });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete invigilation.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper role="admin">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header — same neutral style as Manage Accounts & Students */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
              ADMIN CONTROL
            </span>
            <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight mt-1">Invigilation Hours</h1>
            <p className="text-[13px] text-[#6b7280]">Assign and manage faculty invigilation duties for upcoming examinations</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={openAddModal}
              className="px-3.5 py-2 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[12.5px] font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Add Invigilation</span>
            </button>
          </div>
        </div>

        {/* Toolbar — search + simple filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by faculty, branch, or duty…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-[38px] text-[13px] bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value as 'all' | InvigilationBranch)}
              className="h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 text-[12.5px] font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {INVIGILATION_BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | InvigilationType)}
              className="h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 text-[12.5px] font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Types</option>
              {INVIGILATION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(24,24,27,0.15)', borderTopColor: '#18181b', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p className="text-[13px] font-medium">Loading invigilation records…</p>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-rose-900">Couldn't load invigilation records</p>
              <p className="text-[12.5px] text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="px-3 py-1.5 text-[12px] font-bold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No invigilation assignments yet"
            description={assignments.length === 0
              ? 'Click "Add Invigilation" to assign a faculty member to a duty slot.'
              : 'No records match the current search or filters.'}
            action={
              assignments.length === 0 ? (
                <Button variant="primary" onClick={openAddModal}>
                  <Plus size={13} className="inline mr-1 -mt-0.5" /> Add First Invigilation
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => { setSearch(''); setFilterBranch('all'); setFilterType('all'); }}>
                  Reset Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table stats bar — matches Users.tsx */}
            <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-slate-200 flex items-center justify-between text-[12px] text-[#6b7280]">
              <span>
                Showing <strong className="text-[#18181b]">{filtered.length}</strong>{' '}
                {filtered.length === 1 ? 'assignment' : 'assignments'}
              </span>
              <span className="text-[11px] text-[#88929e]">Scroll horizontally if needed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#edf0f2] text-[#374151] border-b border-slate-200">
                    <th className="px-2.5 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 w-10">#</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 w-14">Photo</th>
                    <th className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Faculty</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Branch</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Invigilation Type</th>
                    <th className="px-3 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Other Duty</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Start Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">End Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Room No</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Block</th>
                    <th className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider text-center whitespace-nowrap w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, index) => {
                    const meta = facultyById.get(a.facultyId);
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-200 hover:bg-[#f0f4f8] transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                        }`}
                      >
                        <td className="px-2.5 py-2 text-center text-[#88929e] font-mono text-[12px] border-r border-slate-200 w-10">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-slate-200 w-14">
                          <div className="flex items-center justify-center">
                            <Avatar
                              name={a.facultyName}
                              src={meta?.avatarUrl}
                              size="sm"
                              role="faculty"
                              className="rounded-full shadow-2xs border border-slate-200/80"
                            />
                          </div>
                        </td>
                        <td className="px-3.5 py-2 font-semibold text-[#18181b] border-r border-slate-200 whitespace-nowrap">
                          {a.facultyName}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.branch}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.type}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-[12.5px] text-[#6b7280]">
                          {a.type === 'Other Duties' ? (a.otherDutyDescription || '—') : '—'}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {formatDate(a.date)}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.startTime}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.endTime}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.roomNo || '—'}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151]">
                          {a.block || '—'}
                        </td>
                        <td className="px-3.5 py-2 text-center whitespace-nowrap w-20">
                          <button
                            type="button"
                            onClick={() => setShowDeleteModal({ open: true, target: a })}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-white border border-rose-200 rounded-md hover:bg-rose-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Delete assignment"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Add Invigilation Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showFormModal && (
          <Modal
            open={showFormModal}
            onClose={closeAddModal}
            title="Add Invigilation"
            description="Assign a faculty member to a duty slot. Required fields are marked with *"
          >
            <form onSubmit={handleAssign} className="flex flex-col gap-3.5 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBranch}
                    onChange={e => {
                      const next = e.target.value as InvigilationBranch;
                      setFormBranch(next);
                      // Clear faculty if they don't belong to the new branch
                      const current = facultyById.get(formFacultyId);
                      if (current && current.branch && current.branch !== next) {
                        setFormFacultyId('');
                      }
                    }}
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs cursor-pointer"
                  >
                    {INVIGILATION_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Faculty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFacultyId}
                    onChange={e => setFormFacultyId(e.target.value)}
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs cursor-pointer"
                  >
                    <option value="">Select faculty…</option>
                    {availableFaculty.length === 0 ? (
                      <option value="" disabled>No faculty available for {formBranch}</option>
                    ) : (
                      availableFaculty.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}{f.designation ? ` — ${f.designation}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Invigilation Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INVIGILATION_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`h-[42px] px-3 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer border ${
                        formType === t
                          ? 'bg-[#18181b] text-white border-[#18181b]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {formType === 'Other Duties' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Other Duty Description <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. PhD entrance exam, Workshop supervision, …"
                    value={formOtherDuty}
                    onChange={e => setFormOtherDuty(e.target.value)}
                    className="bg-slate-50 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    <CalendarDays size={11} className="inline mr-1 -mt-0.5" /> Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    <Clock size={11} className="inline mr-1 -mt-0.5" /> Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    <Clock size={11} className="inline mr-1 -mt-0.5" /> End Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Room No
                  </label>
                  <input
                    type="text"
                    value={formRoomNo}
                    onChange={e => setFormRoomNo(e.target.value)}
                    placeholder="e.g. A-204"
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Block
                  </label>
                  <input
                    type="text"
                    value={formBlock}
                    onChange={e => setFormBlock(e.target.value)}
                    placeholder="e.g. Block A"
                    className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 font-bold text-slate-800 text-[13px] shadow-2xs"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] font-medium text-rose-800">{formError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  className="px-4 py-2 text-[12.5px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={13} className="inline mr-1 -mt-0.5" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-[12.5px] font-bold text-white bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] rounded-xl transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <FileText size={13} />
                      Assign Invigilation
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal.open && showDeleteModal.target && (
          <Modal
            open
            onClose={() => { if (!deleting) setShowDeleteModal({ open: false, target: null }); }}
            title="Delete this invigilation?"
            size="sm"
          >
            <p className="text-[13px] text-slate-700 leading-relaxed">
              You're about to remove the{' '}
              <strong className="text-[#18181b]">{showDeleteModal.target.type}</strong> invigilation for{' '}
              <strong className="text-[#18181b]">{showDeleteModal.target.facultyName}</strong> (
              {showDeleteModal.target.branch}) on{' '}
              <strong className="text-[#18181b]">{formatDate(showDeleteModal.target.date)}</strong> at{' '}
              <strong className="text-[#18181b]">{showDeleteModal.target.startTime}–{showDeleteModal.target.endTime}</strong>.
              This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal({ open: false, target: null })}
                disabled={deleting}
                className="px-4 py-2 text-[12.5px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-[12.5px] font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
              >
                {deleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
