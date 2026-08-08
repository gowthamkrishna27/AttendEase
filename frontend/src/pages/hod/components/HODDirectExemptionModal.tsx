import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckSquare, Square, ShieldCheck, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/shared/Modal';
import { Avatar } from '../../../components/shared/Avatar';
import * as api from '../../../lib/api';
import { DEPARTMENTS } from '../../../lib/utils';
import type { Student } from '../../../types';

interface HODDirectExemptionModalProps {
  open: boolean;
  onClose: () => void;
}

const YEARS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS = ['All Sections', 'Section A', 'Section B'];

export function HODDirectExemptionModal({ open, onClose }: HODDirectExemptionModalProps) {
  const queryClient = useQueryClient();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  const todayStr = new Date().toISOString().split('T')[0];
  const [reason, setReason] = useState('Class Work Exemption');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all students
  const { data: studentsList = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['all-students-directory'],
    queryFn: () => api.getAllStudents(),
    enabled: open,
  });

  // Filter students based on HOD dropdowns + search query
  const filteredStudents = studentsList.filter((s: Student) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesDept = !deptFilter || s.department === deptFilter;

    let matchesYear = true;
    if (yearFilter !== 'All Years') {
      const targetYearNum = yearFilter.match(/([1-4])/)?.[1];
      if (targetYearNum && s.semester) {
        const derivedYear = String(Math.ceil(s.semester / 2));
        matchesYear = derivedYear === targetYearNum;
      }
    }

    let matchesSec = true;
    if (sectionFilter !== 'All Sections') {
      const isSecB = sectionFilter.includes('B');
      const roll = s.rollNumber.toUpperCase();
      const isRollB = /(7[3-9]|[89]\d|[A-C]\d|D[01]|LE\d+)$/i.test(roll) || roll.endsWith('-B') || roll.includes('95A');
      matchesSec = isSecB ? isRollB : !isRollB;
    }

    return matchesSearch && matchesDept && matchesYear && matchesSec;
  });

  // Submit Mutation
  const grantMutation = useMutation({
    mutationFn: (payload: api.HODDirectExemptionPayload) => api.grantHODDirectExemption(payload),
    onSuccess: (res) => {
      setSuccessMsg(res.message || `Direct permission granted to ${selectedStudentIds.length} student(s)!`);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['public-approved-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['public-approved-requests-for-attendance'] });
      setTimeout(() => {
        handleResetAndClose();
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to grant exemption. Please try again.');
    },
  });

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleResetAndClose = () => {
    setSelectedStudentIds([]);
    setSearch('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedStudentIds.length === 0) {
      setErrorMsg('Please select at least one student.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please enter an exemption reason.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Please select a start date.');
      return;
    }

    grantMutation.mutate({
      studentIds: selectedStudentIds,
      reason: reason.trim(),
      startDate,
      endDate: endDate || startDate,
      startTime,
      endTime,
      description: description.trim() || `Direct HOD Class Work Exemption for ${reason.trim()}`,
    });
  };

  return (
    <Modal
      open={open}
      onClose={handleResetAndClose}
      title="Grant Direct Student Exemption"
      description="Select students from any section and issue an official HOD class work exemption."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold rounded-xl flex items-center gap-2">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Student Selection */}
        <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-500" />
              <span className="text-[13px] font-bold text-slate-800">1. Select Students</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-extrabold text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                {selectedStudentIds.length} Selected
              </span>
              {filteredStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] font-bold text-slate-600 hover:text-orange-600 underline cursor-pointer"
                >
                  {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'Deselect Filtered' : 'Select All Filtered'}
                </button>
              )}
            </div>
          </div>

          {/* Search + Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Row 1: Search + Department */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name or Roll No..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="h-9 px-2.5 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 cursor-pointer"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Row 2: Year + Section */}
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="h-9 px-2.5 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 cursor-pointer"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="h-9 px-2.5 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 cursor-pointer"
            >
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Scrollable Student List */}
          <div className="max-h-[180px] overflow-y-auto bg-white border border-slate-200/90 rounded-xl divide-y divide-slate-100 p-1">
            {isLoadingStudents ? (
              <div className="p-4 text-center text-slate-400 text-[12px] flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-orange-500" />
                <span>Loading student list...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-[12px]">
                No students match your filter or search query.
              </div>
            ) : (
              filteredStudents.map(student => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50/80 border border-orange-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button type="button" className="text-orange-500 shrink-0">
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                      </button>
                      <Avatar name={student.name} src={student.avatarUrl} size="sm" role="student" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[12px] text-slate-800 truncate">{student.name}</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-500">{student.rollNumber}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400">
                          {student.department} • {student.section || 'Section A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Step 2: Exemption Details */}
        <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            <span className="text-[13px] font-bold text-slate-800">2. Exemption Reason &amp; Schedule</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Exemption Reason / Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Class Work Exemption for Hackathon / NSS / Sports"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full h-10 px-3 text-[13px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-9 px-2 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-9 px-2 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full h-9 px-2 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full h-9 px-2 text-[12px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              HOD Remarks / Permission Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add optional notes regarding this voluntary exemption..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2.5 text-[12.5px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={grantMutation.isPending}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-[13px] rounded-xl flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {grantMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Granting Exemption...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Grant Class Work Exemption</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
