import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, UserPlus, Trash2, CheckCircle2, AlertCircle, Users, GraduationCap, X } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { EmptyState } from '../../components/shared/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

export default function AdminCounseling() {
  const queryClient = useQueryClient();
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchUnassigned, setSearchUnassigned] = useState('');
  const [searchFaculty, setSearchFaculty] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch admin counseling overview data
  const { data, isLoading } = useQuery({
    queryKey: ['admin-counseling'],
    queryFn: () => api.getAdminCounselingData(),
  });

  const facultyCounselors = data?.facultyCounselors ?? [];
  const unassignedStudents = data?.unassignedStudents ?? [];

  // Assign Mutation
  const assignMutation = useMutation({
    mutationFn: ({ facultyId, studentIds }: { facultyId: string; studentIds: string[] }) =>
      api.assignCounselingStudents(facultyId, studentIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-counseling'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedStudentIds([]);
      setToastMsg(`✅ ${res.message}`);
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to assign students');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Unassign Mutation
  const unassignMutation = useMutation({
    mutationFn: (studentId: string) => api.unassignCounselingStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-counseling'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToastMsg('✅ Student unassigned from counselor');
      setTimeout(() => setToastMsg(null), 4000);
    },
  });

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredUnassigned.map(s => s.id);
    setSelectedStudentIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleAssign = () => {
    if (!selectedFacultyId) {
      setErrorMsg('Please select a target Faculty member first.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    if (selectedStudentIds.length === 0) {
      setErrorMsg('Please select at least one student to assign.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    assignMutation.mutate({ facultyId: selectedFacultyId, studentIds: selectedStudentIds });
  };

  const filteredUnassigned = unassignedStudents.filter(s =>
    (s.name || '').toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    (s.rollNumber || s.id || '').toLowerCase().includes(searchUnassigned.toLowerCase())
  );

  const filteredFaculty = facultyCounselors.filter(f =>
    (f.name || '').toLowerCase().includes(searchFaculty.toLowerCase()) ||
    (f.department || '').toLowerCase().includes(searchFaculty.toLowerCase())
  );

  const selectedFacultyObj = facultyCounselors.find(f => f.id === selectedFacultyId || (f as any).userId === selectedFacultyId);

  return (
    <PageWrapper role="admin">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Admin Portal</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Faculty Counseling Management</h1>
          <p className="text-[14px] text-slate-400 mt-1">Assign students to faculty counselors and manage departmental counseling workloads</p>
        </motion.div>

        {/* Toast Alerts */}
        {toastMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[13px] font-bold shadow-xs">
            {toastMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[13px] font-bold shadow-xs">
            {errorMsg}
          </div>
        )}

        {/* ── Step 1: Assignment Studio (2-Column Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Select Faculty Counselor */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UserCheck size={18} className="text-orange-500" />
              <h2 className="text-[16px] font-bold text-slate-900">1. Select Faculty Counselor</h2>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter faculty by name…"
                value={searchFaculty}
                onChange={e => setSearchFaculty(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredFaculty.map(f => {
                const isSelected = selectedFacultyId === f.id || selectedFacultyId === (f as any).userId;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFacultyId(f.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-500/20'
                        : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={f.name} src={f.avatarUrl} size="sm" role="faculty" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{f.name}</p>
                        <p className="text-[11px] text-slate-400">{f.department} • {f.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10.5px] font-bold shrink-0">
                      {f.counselees?.length ?? 0} Students
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Multi-Select Students to Assign */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-orange-500" />
                  <h2 className="text-[16px] font-bold text-slate-900">2. Select Students to Assign</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-orange-600 hover:underline cursor-pointer"
                  >
                    Select All ({filteredUnassigned.length})
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Target Notice */}
              {selectedFacultyObj ? (
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-[12px] text-orange-900 font-medium flex items-center justify-between">
                  <span>Assigning to: <strong>{selectedFacultyObj.name}</strong></span>
                  <span className="font-bold text-orange-700">{selectedStudentIds.length} Selected</span>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] text-slate-500 font-medium italic">
                  👈 Select a faculty counselor on the left to assign students.
                </div>
              )}

              {/* Search Unassigned */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search students by roll number or name…"
                  value={searchUnassigned}
                  onChange={e => setSearchUnassigned(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              {/* Students Checklist */}
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {filteredUnassigned.length === 0 ? (
                  <p className="text-[12px] text-slate-400 text-center py-6">No unassigned students match your filter.</p>
                ) : (
                  filteredUnassigned.map(s => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        onClick={() => handleToggleSelectStudent(s.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="text-[13px] font-bold text-slate-800 truncate block">{s.name}</span>
                            <span className="text-[11px] font-mono text-slate-400 font-bold">{s.rollNumber || s.id}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {s.department}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAssign}
                disabled={assignMutation.isPending || !selectedFacultyId || selectedStudentIds.length === 0}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-[13px] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck size={16} />
                <span>Assign {selectedStudentIds.length} Student(s) to Counselor</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── Step 2: Faculty Counseling Directory ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">Current Faculty Counseling Directory</h2>
              <p className="text-[12px] text-slate-400">View and manage assigned counselees per faculty member</p>
            </div>
            <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[11px] font-bold">
              {facultyCounselors.length} Faculty Members
            </span>
          </div>

          <div className="space-y-4">
            {facultyCounselors.map(faculty => (
              <div key={faculty.id} className="border border-slate-200/70 rounded-xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={faculty.name} src={faculty.avatarUrl} size="md" role="faculty" />
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">{faculty.name}</h3>
                      <p className="text-[12px] text-slate-500">{faculty.department} • {faculty.email}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-700 shadow-2xs">
                    {faculty.counselees?.length ?? 0} Counselees
                  </span>
                </div>

                {faculty.counselees && faculty.counselees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                    {faculty.counselees.map(st => (
                      <div
                        key={st.id}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-800 truncate">{st.name}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400">{st.rollNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => unassignMutation.mutate(st.id)}
                          className="w-6 h-6 rounded-md bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-all shrink-0"
                          title="Unassign Student"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-slate-400 italic pt-1">No counselees assigned to this faculty member yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
