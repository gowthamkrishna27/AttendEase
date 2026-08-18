import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/shared/Avatar';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch]   = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'student' | 'faculty' | 'hod' | 'admin'>('all');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser]     = useState<api.AuthUser | null>(null);

  // Bulk Import state
  const [importFile, setImportFile]           = useState<File | null>(null);
  const [isUploading, setIsUploading]         = useState(false);
  const [isDraggingOver, setIsDraggingOver]   = useState(false);
  const dragCounterRef = useRef(0);

  // Form state
  const [formId, setFormId]         = useState('');
  const [formName, setFormName]     = useState('');
  const [formEmail, setFormEmail]   = useState('');
  const [formRole, setFormRole]     = useState<api.UserRole>('student');
  const [formDept, setFormDept]     = useState('CSIT');
  const [formPass, setFormPass]     = useState('');
  const [formRoll, setFormRoll]     = useState('');
  const [formSem, setFormSem]       = useState(6);
  const [formYear, setFormYear]     = useState('3rd Year');
  const [formSection, setFormSection] = useState('CSIT-A');
  const [formAvatar, setFormAvatar] = useState('');
  const [formCounselorId, setFormCounselorId] = useState('');
  const [formError, setFormError]   = useState('');

  const { data: usersList = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const facultyList = usersList.filter(u => u.role === 'faculty' || u.role === 'hod');

  // ── Global window drag-and-drop for CSV/Excel ────────────────────────────────
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) setIsDraggingOver(true);
    };
    const onDragOver = (e: DragEvent) => { e.preventDefault(); };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current === 0) setIsDraggingOver(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.type.includes('csv') || file.type.includes('spreadsheet'))) {
        handleAutoUpload(file);
      }
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: api.CreateUserPayload) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowFormModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create user');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.CreateUserPayload> }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowFormModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update user');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const resetForm = () => {
    setEditingUser(null);
    setFormId('');
    setFormName('');
    setFormEmail('');
    setFormRole('student');
    setFormDept('CSIT');
    setFormPass('');
    setFormRoll('');
    setFormSem(6);
    setFormYear('3rd Year');
    setFormSection('CSIT-A');
    setFormAvatar('');
    setFormCounselorId('');
    setFormError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Register Number,Student Name,Year,Branch,Section,Role\n' +
      '23B91A0701,BARAKATA TARUN SWAMY,4,CSIT,A,student\n' +
      '23B91A0702,BARRI SRAVYA SREE,4,CSIT,A,student\n' +
      '24B91A0701,Gowtham Krishna,3,CSIT,A,student\n' +
      'FAC-CSIT-001,Dr. J. Somaraju,3,CSIT,A,faculty\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Called directly from header file-input or window drop — auto-uploads and shows alert
  const handleAutoUpload = async (file: File) => {
    setImportFile(file);
    setIsUploading(true);
    try {
      const report = await api.importStudentsFile(file);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['public-sections'] });
      const failedCount = report.failed?.length || 0;
      const failedLines = failedCount > 0
        ? '\n\nFailed rows:\n' + report.failed.map(f => `  Row ${f.row ?? '?'}: ${f.reason}`).join('\n')
        : '';
      window.alert(
        `✅ Import Complete — ${file.name}\n\n` +
        `  ➕ New added : ${report.inserted}\n` +
        `  🔄 Updated  : ${report.upserted || report.skipped || 0}\n` +
        `  ❌ Failed   : ${failedCount}` +
        failedLines
      );
    } catch (err: any) {
      window.alert(`❌ Import Failed\n\n${err.message || 'Failed to upload student file.'}`);
    } finally {
      setIsUploading(false);
      setImportFile(null);
    }
  };

  const handleOpenEdit = (u: api.AuthUser) => {
    setEditingUser(u);
    setFormId(u.id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormDept(u.department);
    setFormPass(''); // don't fill password
    setFormRoll(u.rollNumber || '');
    setFormSem(u.semester || 6);
    setFormYear(u.year || '3rd Year');
    setFormSection(u.section || 'CSIT-A');
    setFormAvatar(u.avatarUrl || '');
    setFormCounselorId(u.counselorId || '');
    setFormError('');
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this account? This will revoke login access.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (formRole === 'student') {
      if (!formRoll.trim() || !formName.trim()) {
        setFormError('Register / Roll Number and Student Name are required.');
        return;
      }
    } else {
      if (!formName.trim() || !formEmail.trim() || !formDept.trim()) {
        setFormError('Name, Email, and Department are required for non-student accounts.');
        return;
      }
    }

    const cleanRoll = formRoll.trim();
    const cleanName = formName.trim();

    const effectiveEmail  = formEmail.trim() || (formRole === 'student' ? `${cleanRoll.toLowerCase()}@srkrec.ac.in` : '');
    const effectiveDept   = formDept.trim()  || 'CSD';
    const effectiveId     = formId.trim()    || (formRole === 'student' ? `stu-${cleanRoll}` : '');
    const effectivePass   = formPass.trim()  || (formRole === 'student' ? cleanRoll : (formRole === 'faculty' || formRole === 'hod' ? '1234' : 'password123'));
    const effectiveAvatar = formAvatar.trim() || (formRole === 'student' && cleanRoll ? `https://srkrexams.in/SRKR/photo/${cleanRoll.toUpperCase()}.jpg` : '');

    if (!editingUser) {
      if (!effectiveId || !effectivePass) {
        setFormError('User ID and Password could not be generated.');
        return;
      }
      createMutation.mutate({
        userId: effectiveId,
        name: cleanName,
        email: effectiveEmail,
        role: formRole,
        department: effectiveDept,
        password: effectivePass,
        ...(formRole === 'student' && { rollNumber: cleanRoll, semester: formSem || 6, year: formYear, section: formSection, counselorId: formCounselorId || undefined }),
        ...(effectiveAvatar && { avatarUrl: effectiveAvatar }),
      });
    } else {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          name: cleanName,
          email: effectiveEmail,
          role: formRole,
          department: effectiveDept,
          ...(formPass && { password: formPass }),
          ...(formRole === 'student' && { rollNumber: cleanRoll, semester: formSem, year: formYear, section: formSection, counselorId: formCounselorId || undefined }),
          ...(effectiveAvatar && { avatarUrl: effectiveAvatar }),
        }
      });
    }
  };

  const filtered = usersList.filter(u => {
    const matchesSearch =
      (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.rollNumber ?? u.userId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : u.role === activeTab;
    return matchesSearch && matchesTab;
  });

  const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <PageWrapper role="admin">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
              ADMIN CONTROL
            </span>
            <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight mt-1">Manage Accounts</h1>
            <p className="text-[13px] text-[#6b7280]">Create, edit, delete and bulk upload Student, Faculty, HOD, and Admin accounts</p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label
              htmlFor="header-csv-file-input"
              className="inline-flex items-center justify-center gap-2 h-[38px] px-3.5 font-medium text-[13px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <UploadCloud size={15} />
              <span>Import CSV / Excel</span>
              <input
                id="header-csv-file-input"
                type="file"
                accept=".csv, .xlsx, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleAutoUpload(e.target.files[0]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </label>
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-1.5 h-[38px] px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white font-medium text-[13px] rounded-lg shadow-xs transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <Plus size={15} />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Toggle Option Tabs */}
        <div className="flex overflow-x-auto bg-[#edf0f2] p-1 rounded-lg mb-4">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'student', label: 'Students' },
            { id: 'faculty', label: 'Faculty' },
            { id: 'hod', label: 'HODs' },
            { id: 'admin', label: 'Admins' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 px-3 min-w-[85px] text-center font-medium text-[12.5px] transition-all rounded-[6px] cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#18181b] text-white shadow-xs'
                  : 'text-[#6b7280] hover:text-[#18181b]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#88929e]" />
            <input
              type="text"
              placeholder="Search by name, email, roll no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 text-[13.5px] bg-[#edf0f2] text-[#18181b] placeholder:text-[#88929e] rounded-lg outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.15)', borderTopColor: '#F97316', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p className="text-[13px] font-medium">Loading user accounts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try adjusting your filters or add a new user to get started."
            action={<Button variant="secondary" onClick={() => { setSearch(''); setActiveTab('student'); }}>Reset Filters</Button>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Stats Bar */}
            <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-slate-200 flex items-center justify-between text-[12px] text-[#6b7280]">
              <span>Showing <strong className="text-[#18181b]">{sorted.length}</strong> {activeTab === 'all' ? 'total accounts' : `${activeTab} accounts`}</span>
              <span className="text-[11px] text-[#88929e]">Scroll horizontally if needed</span>
            </div>

            {/* Structured Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#edf0f2] text-[#374151] border-b border-slate-200">
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 w-10">#</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 w-14">Photo</th>
                    <th className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Register No.</th>
                    <th className="px-4 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Full Name</th>
                    <th className="px-4 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Email Address</th>
                    <th className="px-3 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 text-center whitespace-nowrap">Role</th>
                    <th className="px-3 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 text-center whitespace-nowrap">Year</th>
                    <th className="px-3 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 text-center whitespace-nowrap">Section</th>
                    <th className="px-3 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 text-center whitespace-nowrap">Branch</th>
                    <th className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider text-center whitespace-nowrap w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((u, index) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-200 hover:bg-[#f0f4f8] transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                      }`}
                    >
                      {/* Serial Number */}
                      <td className="px-3 py-2 text-center text-[#88929e] font-mono text-[12px] border-r border-slate-200 w-10">
                        {index + 1}
                      </td>

                      {/* Photo Avatar */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 w-14">
                        <div className="flex items-center justify-center">
                          <Avatar name={u.name} src={u.avatarUrl} rollNumber={u.rollNumber} size="sm" role={u.role} className="rounded-full shadow-2xs border border-slate-200/80" />
                        </div>
                      </td>

                      {/* Register Number */}
                      <td className="px-3.5 py-2 font-mono font-medium text-[#18181b] border-r border-slate-200 whitespace-nowrap">
                        {u.rollNumber || '—'}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2 font-semibold text-[#18181b] border-r border-slate-200 whitespace-nowrap">
                        {u.name}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-2 text-[#6b7280] border-r border-slate-200 whitespace-nowrap text-[12.5px]">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12.5px] font-medium text-[#374151] capitalize">
                        {u.role === 'hod' ? 'HOD' : u.role}
                      </td>

                      {/* Year */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12px] text-[#374151]">
                        {u.year || '—'}
                      </td>

                      {/* Section */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap text-[12px] font-medium text-[#374151]">
                        {u.section ? `Sec ${u.section}` : '—'}
                      </td>

                      {/* Branch / Department */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 whitespace-nowrap font-medium text-[12px] text-[#374151]">
                        {u.department}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="w-6 h-6 bg-[#edf0f2] hover:bg-[#18181b] text-[#374151] hover:text-white rounded flex items-center justify-center transition-all cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="w-6 h-6 bg-[#edf0f2] hover:bg-rose-600 text-[#374151] hover:text-white rounded flex items-center justify-center transition-all cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          title={editingUser ? 'Edit Portal Account' : 'Add New Account'}
          description={formRole === 'student' ? 'Fill Register Number and Name to auto-generate student details' : 'Enter account details below'}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-2">
            {/* System Role Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Account Type / Role
              </label>
              <select
                value={formRole}
                onChange={e => setFormRole(e.target.value as api.UserRole)}
                className="w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-bold text-slate-800 text-[13px] shadow-2xs"
              >
                <option value="student">Student Account</option>
                <option value="faculty">Faculty Account</option>
                <option value="hod">HOD Account</option>
                <option value="admin">Admin Account</option>
              </select>
            </div>

            {/* Mandatory Student Inputs Box */}
            {formRole === 'student' ? (
              <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-xl space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1">
                  <span>Required Student Details</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Register Number <span className="text-orange-600 font-extrabold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. 24B91A0702"
                      value={formRoll}
                      onChange={e => setFormRoll(e.target.value)}
                      className="bg-white font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Student Name <span className="text-orange-600 font-extrabold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Gowtham Krishna"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="bg-white font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Assign Faculty Counselor
                  </label>
                  <select
                    value={formCounselorId}
                    onChange={e => setFormCounselorId(e.target.value)}
                    className="w-full h-[40px] px-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-800 text-[12px]"
                  >
                    <option value="">-- Select Faculty Counselor --</option>
                    {facultyList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-orange-600 font-bold">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Dr. K. V. Sharma"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Email Address <span className="text-orange-600 font-bold">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="name@college.edu"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Department / Branch & Year / User ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Branch / Department</label>
                <select
                  value={formDept}
                  onChange={e => setFormDept(e.target.value)}
                  className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                >
                  <option value="CSD">CSD</option>
                  <option value="CSIT">CSIT</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              {formRole === 'student' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Year</label>
                  <select
                    value={formYear}
                    onChange={e => setFormYear(e.target.value)}
                    className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              ) : !editingUser ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">User ID</label>
                  <Input
                    placeholder="e.g. fac-002"
                    value={formId}
                    onChange={e => setFormId(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {/* Semester & Section for Student */}
            {formRole === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Semester</label>
                  <select
                    value={formSem}
                    onChange={e => setFormSem(Number(e.target.value))}
                    className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                  >
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Section</label>
                  <select
                    value={formSection}
                    onChange={e => setFormSection(e.target.value)}
                    className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                  >
                    <option value="CSD-A">CSD-A</option>
                    <option value="CSD-B">CSD-B</option>
                    <option value="CSIT-A">CSIT-A</option>
                    <option value="CSIT-B">CSIT-B</option>
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                  </select>
                </div>
              </div>
            )}

            {/* Student optional details: Email & User ID */}
            {formRole === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Email Address <span className="text-[10px] text-slate-400 font-normal">(auto-filled)</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="rollNumber@srkrec.ac.in"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      User ID <span className="text-[10px] text-slate-400 font-normal">(auto-filled)</span>
                    </label>
                    <Input
                      placeholder="stu-24B91A0702"
                      value={formId}
                      onChange={e => setFormId(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Password / 4-Digit Passcode Field */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {formRole === 'faculty' || formRole === 'hod' ? '4-Digit Passcode' : 'Password'}{' '}
                {editingUser ? (
                  <span className="text-[10px] text-slate-400">(leave blank to keep current)</span>
                ) : formRole === 'faculty' || formRole === 'hod' ? (
                  <span className="text-[10px] text-slate-400 font-normal">(defaults to 1234)</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">(defaults to Roll Number)</span>
                )}
              </label>
              <Input
                type="text"
                maxLength={formRole === 'faculty' || formRole === 'hod' ? 4 : undefined}
                placeholder={
                  editingUser
                    ? 'Leave blank to keep current'
                    : formRole === 'faculty' || formRole === 'hod'
                    ? 'e.g. 1234'
                    : 'Defaults to Roll Number'
                }
                value={formPass}
                onChange={e => setFormPass(e.target.value)}
              />
            </div>

            {/* Avatar URL Field */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Avatar Photo Link <span className="text-[10px] text-slate-400 font-normal">(optional — defaults to SRKR photo)</span>
              </label>
              <Input
                type="text"
                placeholder="https://srkrexams.in/SRKR/photo/24B91A0702.jpg"
                value={formAvatar}
                onChange={e => setFormAvatar(e.target.value)}
              />
            </div>

            {formError && (
              <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 font-medium">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-1">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="h-[38px] px-4 bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#374151] text-[13px] font-medium rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-[38px] px-5 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[13px] font-medium rounded-lg shadow-xs transition-all cursor-pointer"
              >
                {editingUser ? 'Save Updates' : 'Add User'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Global drag-over overlay ─────────────────────────────────── */}
        <AnimatePresence>
          {isDraggingOver && (
            <motion.div
              key="drag-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 16,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={36} color="#fff" />
              </motion.div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.3 }}>
                Drop to Import
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                CSV or Excel file
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
