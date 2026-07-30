import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, UserPlus, Trash2, GraduationCap, Building2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

// Helper to extract last 2 characters or suffix from roll number (e.g. 24B91A0744 -> 44, 24B91A07LE1 -> LE1)
function extractRollSuffix(rollStr: string): string {
  if (!rollStr) return '';
  const clean = rollStr.trim().toUpperCase();
  const leMatch = clean.match(/LE0*([1-9]|1[0-2])$/);
  if (leMatch) {
    return `LE${leMatch[1]}`;
  }
  const suffixMatch = clean.match(/([A-D][0-9]|[0-9]{1,2})$/);
  if (suffixMatch) {
    const val = suffixMatch[1];
    if (/^\d+$/.test(val)) {
      return String(parseInt(val, 10));
    }
    return val;
  }
  return clean;
}

// Year roll number prefix mapping
const YEAR_PREFIX_MAP: Record<string, string> = {
  '1st Year': '26',
  '2nd Year': '25',
  '3rd Year': '24',
  '4th Year': '23',
};

// Generate roll numbers strictly based on Section:
// - CSD & CSIT A: 1 to 72
// - CSIT B: 73 to 99, A0-A9, B0-B9, C0-C9, D0, D1, LE1 to LE12
function getRollNumbersForSection(sectionKey: string): string[] {
  if (sectionKey.includes('CSIT B') || sectionKey.includes('CSIT-B')) {
    const list: string[] = [];
    for (let i = 73; i <= 99; i++) list.push(String(i));
    for (let i = 0; i <= 9; i++) list.push(`A${i}`);
    for (let i = 0; i <= 9; i++) list.push(`B${i}`);
    for (let i = 0; i <= 9; i++) list.push(`C${i}`);
    list.push('D0', 'D1');
    for (let i = 1; i <= 12; i++) list.push(`LE${i}`);
    return list;
  }

  // CSD and CSIT A: 1 to 72
  return Array.from({ length: 72 }, (_, i) => String(i + 1));
}

// Check if a student belongs to the selected Year & Section
function isStudentInYearAndSection(
  student: api.AuthUser,
  selectedYear: string,
  selectedSection: 'CSIT A' | 'CSIT B' | 'CSD'
): boolean {
  const roll = (student.rollNumber || student.id || '').toUpperCase();
  const dept = (student.department || '').toUpperCase();

  // 1. Department / Section filtering
  if (selectedSection === 'CSD') {
    if (dept !== 'CSD') return false;
  } else if (selectedSection === 'CSIT A') {
    if (dept !== 'CSIT' && dept !== 'CSIT-A') return false;
    const suffix = extractRollSuffix(roll);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && (num < 1 || num > 72)) return false;
  } else if (selectedSection === 'CSIT B') {
    if (dept !== 'CSIT' && dept !== 'CSIT-B') return false;
    const suffix = extractRollSuffix(roll);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num >= 1 && num <= 72) return false;
  }

  // 2. Year filtering (Roll Prefix: 26=1st, 25=2nd, 24=3rd, 23=4th)
  const expectedPrefix = YEAR_PREFIX_MAP[selectedYear];
  if (expectedPrefix && roll.length >= 2) {
    if (roll.startsWith(expectedPrefix)) return true;
  }

  // Fallback to semester if available
  if (student.semester) {
    const sem = student.semester;
    if (selectedYear === '1st Year' && (sem === 1 || sem === 2)) return true;
    if (selectedYear === '2nd Year' && (sem === 3 || sem === 4)) return true;
    if (selectedYear === '3rd Year' && (sem === 5 || sem === 6)) return true;
    if (selectedYear === '4th Year' && (sem === 7 || sem === 8)) return true;
  }

  // Default fallback to 3rd Year for standard un-prefixed roll numbers
  return selectedYear === '3rd Year';
}

export default function AdminCounseling() {
  const queryClient = useQueryClient();
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('3rd Year');
  const [selectedSection, setSelectedSection] = useState<'CSIT A' | 'CSIT B' | 'CSD'>('CSIT A');
  const [searchFaculty, setSearchFaculty] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch admin counseling overview data
  const { data } = useQuery({
    queryKey: ['admin-counseling'],
    queryFn: () => api.getAdminCounselingData(),
  });

  const facultyCounselors = data?.facultyCounselors ?? [];
  const unassignedStudents = data?.unassignedStudents ?? [];

  // Filter unassigned students matching current Year & Section
  const activeUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter(s => isStudentInYearAndSection(s, selectedYear, selectedSection));
  }, [unassignedStudents, selectedYear, selectedSection]);

  // Student map for the currently selected Year & Section (suffix -> student)
  const currentSectionStudentsMap = useMemo(() => {
    const map = new Map<string, api.AuthUser>();

    // 1. Add unassigned for active Year & Section
    activeUnassignedStudents.forEach(s => {
      const roll = s.rollNumber || s.id;
      const suffix = extractRollSuffix(roll);
      if (suffix) map.set(suffix, s);
    });

    // 2. Add assigned for active Year & Section
    facultyCounselors.forEach(f => {
      f.counselees?.forEach(s => {
        if (isStudentInYearAndSection(s, selectedYear, selectedSection)) {
          const roll = s.rollNumber || s.id;
          const suffix = extractRollSuffix(roll);
          if (suffix) map.set(suffix, s);
        }
      });
    });

    return map;
  }, [activeUnassignedStudents, facultyCounselors, selectedYear, selectedSection]);

  // Counselor map for current Year & Section (suffix -> counselorName)
  const currentCounselorMap = useMemo(() => {
    const map = new Map<string, string>();
    facultyCounselors.forEach(f => {
      f.counselees?.forEach(s => {
        if (isStudentInYearAndSection(s, selectedYear, selectedSection)) {
          const roll = s.rollNumber || s.id;
          const suffix = extractRollSuffix(roll);
          if (suffix) map.set(suffix, f.name);
        }
      });
    });
    return map;
  }, [facultyCounselors, selectedYear, selectedSection]);

  // Section Roll Numbers list (dynamic per selected section)
  const sectionRollNumbers = useMemo(
    () => getRollNumbersForSection(selectedSection),
    [selectedSection]
  );

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

  const handleToggleRollNumber = (suffix: string) => {
    const student = currentSectionStudentsMap.get(suffix);
    let targetId = '';

    if (student) {
      targetId = student.id || (student as any).userId;
    } else {
      const yrPrefix = YEAR_PREFIX_MAP[selectedYear] || '24';
      const formattedSuffix = String(suffix).padStart(2, '0');
      targetId = `stu-${yrPrefix}B91A07${formattedSuffix}`;
    }

    setSelectedStudentIds(prev =>
      prev.includes(targetId) ? prev.filter(i => i !== targetId) : [...prev, targetId]
    );
  };

  const handleSelectAllSection = () => {
    const idsToSelect: string[] = [];
    const yrPrefix = YEAR_PREFIX_MAP[selectedYear] || '24';

    sectionRollNumbers.forEach(suffix => {
      const student = currentSectionStudentsMap.get(suffix);
      if (student) {
        idsToSelect.push(student.id || (student as any).userId);
      } else {
        const formattedSuffix = String(suffix).padStart(2, '0');
        idsToSelect.push(`stu-${yrPrefix}B91A07${formattedSuffix}`);
      }
    });
    setSelectedStudentIds(idsToSelect);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleAssign = () => {
    if (!selectedFacultyId) {
      setErrorMsg('Please select a target Faculty member first on the left column.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    if (selectedStudentIds.length === 0) {
      setErrorMsg('Please select at least one student roll number to assign.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    assignMutation.mutate({ facultyId: selectedFacultyId, studentIds: selectedStudentIds });
  };

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
          <p className="text-[14px] text-slate-400 mt-1">Assign students to faculty counselors using the interactive section roll grid</p>
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

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
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

          {/* Right Column: Interactive Roll Number Grid */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-orange-500" />
                  <h2 className="text-[16px] font-bold text-slate-900">2. Select Students by Roll Number</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAllSection}
                    className="text-orange-600 hover:underline cursor-pointer"
                  >
                    Select All
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

              {/* Top Filter Controls: Year & Section */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 space-y-2.5">
                {/* Year Selectors */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <GraduationCap size={13} className="text-orange-500" />
                    Year:
                  </span>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYear(yr);
                        setSelectedStudentIds([]);
                      }}
                      className={`px-3 py-1 font-bold rounded-lg cursor-pointer shrink-0 transition-all ${
                        selectedYear === yr
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {/* Section Selectors */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Building2 size={13} className="text-orange-500" />
                    Section:
                  </span>
                  {(['CSD', 'CSIT A', 'CSIT B'] as const).map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setSelectedSection(sec);
                        setSelectedStudentIds([]);
                      }}
                      className={`px-3 py-1 font-bold rounded-lg cursor-pointer shrink-0 transition-all ${
                        selectedSection === sec
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Stationary Roll Number Buttons Grid (Dynamic per Year & Section) ── */}
              <div className="p-3 bg-slate-50/40 border border-slate-200/50 rounded-xl">
                <div className="flex flex-wrap justify-center gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {sectionRollNumbers.map(suffix => {
                    const student = currentSectionStudentsMap.get(suffix);
                    const yrPrefix = YEAR_PREFIX_MAP[selectedYear] || '24';
                    const formattedSuffix = String(suffix).padStart(2, '0');
                    const targetId = student ? (student.id || (student as any).userId) : `stu-${yrPrefix}B91A07${formattedSuffix}`;
                    
                    const isSelected = selectedStudentIds.includes(targetId);
                    const assignedCounselor = currentCounselorMap.get(suffix);

                    let buttonBg = 'bg-white border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300';
                    if (isSelected) {
                      buttonBg = 'bg-orange-500 border-orange-600 text-white shadow-md ring-2 ring-orange-300';
                    } else if (assignedCounselor) {
                      buttonBg = 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-orange-50';
                    }

                    return (
                      <motion.button
                        key={suffix}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleToggleRollNumber(suffix)}
                        className={`
                          w-[50px] h-[50px] sm:w-[54px] sm:h-[54px]
                          rounded-xl font-extrabold text-[13px] sm:text-[14px]
                          flex flex-col items-center justify-center
                          select-none cursor-pointer border shadow-2xs shrink-0
                          transition-all duration-150 relative
                          ${buttonBg}
                        `}
                        title={
                          assignedCounselor
                            ? `[${selectedYear} ${selectedSection}] Roll #${suffix}: Assigned to ${assignedCounselor}. Click to toggle.`
                            : `[${selectedYear} ${selectedSection}] Roll #${suffix}: Click to select for assignment`
                        }
                      >
                        <span>{suffix}</span>
                        {assignedCounselor && !isSelected && (
                          <span className="text-[8px] opacity-75 truncate max-w-[42px]">
                            {assignedCounselor.split(' ')[0]}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
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

        {/* ── Step 2: Faculty Counseling Directory Overview ── */}
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
                          <Trash2 size={13} />
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
