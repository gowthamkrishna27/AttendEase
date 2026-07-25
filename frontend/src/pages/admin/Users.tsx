import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
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
  const [search, setSearch]   = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'student' | 'faculty' | 'hod' | 'admin'>('all');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser]     = useState<api.AuthUser | null>(null);

  // Form state
  const [formId, setFormId]         = useState('');
  const [formName, setFormName]     = useState('');
  const [formEmail, setFormEmail]   = useState('');
  const [formRole, setFormRole]     = useState<api.UserRole>('student');
  const [formDept, setFormDept]     = useState('CSIT');
  const [formPass, setFormPass]     = useState('');
  const [formRoll, setFormRoll]     = useState('');
  const [formSem, setFormSem]       = useState(6);
  const [formAvatar, setFormAvatar] = useState('');
  const [formError, setFormError]   = useState('');

  const { data: usersList = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

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
    setFormAvatar('');
    setFormError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowFormModal(true);
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
    setFormAvatar(u.avatarUrl || '');
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

    if (!formName.trim() || !formEmail.trim() || !formDept.trim()) {
      setFormError('Name, Email, and Department are required.');
      return;
    }

    if (formRole === 'student' && !formRoll.trim()) {
      setFormError('Roll Number is required for Student accounts.');
      return;
    }

    const effectiveId = formId.trim() || (formRole === 'student' ? `stu-${formRoll.trim()}` : '');
    const effectivePass = formPass || (formRole === 'student' ? formRoll.trim() : '');
    const effectiveAvatar = formAvatar.trim() || (formRole === 'student' && formRoll.trim() ? `https://srkrexams.in/SRKR/photo/${formRoll.trim()}.jpg` : '');

    if (!editingUser) {
      if (!effectiveId || !effectivePass) {
        setFormError('User ID and Password are required for non-student accounts.');
        return;
      }
      createMutation.mutate({
        userId: effectiveId,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        department: formDept,
        password: effectivePass,
        ...(formRole === 'student' && { rollNumber: formRoll.trim(), semester: formSem }),
        ...(effectiveAvatar && { avatarUrl: effectiveAvatar }),
      });
    } else {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          department: formDept,
          ...(formPass && { password: formPass }),
          ...(formRole === 'student' && { rollNumber: formRoll.trim(), semester: formSem }),
          avatarUrl: effectiveAvatar,
        }
      });
    }
  };

  const filtered = usersList.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.rollNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : u.role === activeTab;
    return matchesSearch && matchesTab;
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageWrapper role="admin">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Admin Control</p>
            <h1 className="text-[26px] font-heading font-bold text-slate-900">Manage Accounts</h1>
            <p className="text-[14px] text-slate-400 mt-1">Full control to create, edit, and delete Student, Faculty, HOD, and Admin accounts</p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 h-[42px] px-5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-[13px] rounded-xl shadow-subtle transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Add New User</span>
          </Button>
        </div>

        {/* Toggle Option Tabs */}
        <div className="flex overflow-x-auto bg-slate-100 border border-slate-200 p-1 rounded-xl mb-5 shadow-subtle">
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
              className={`flex-1 py-2 px-3 min-w-[90px] text-center font-bold text-[12px] sm:text-[13px] transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search by name, email, roll no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-[42px] pl-9 pr-4 text-[13px] sm:text-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/12 transition-all shadow-subtle"
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
          <div className="card overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">User</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Role</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Department</th>
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">ID / Roll No.</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(u => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatarUrl} size="sm" role={u.role} />
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">{u.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wider ${
                          u.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                          u.role === 'faculty' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] text-slate-600 font-semibold">{u.department}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] font-mono text-slate-500">{u.rollNumber || u.id}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="w-7 h-7 bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-500 border border-slate-200 hover:border-orange-200 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                            title="Edit User"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="w-7 h-7 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                            title="Delete User"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {sorted.map(u => (
                <div key={u.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatarUrl} size="sm" role={u.role} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-slate-800 truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-500 font-mono">{u.rollNumber || u.id}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                        u.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        u.role === 'faculty' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-orange-50 text-orange-600 border-orange-200'
                      }`}>
                        {u.role}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">
                        {u.department}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Quick Actions</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-3.5 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all active:bg-orange-500 active:text-white"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all active:bg-rose-500 active:text-white"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          title={editingUser ? 'Edit Portal Account' : 'Add New Account'}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {!editingUser && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  User ID {formRole === 'student' && <span className="text-[10px] text-slate-400 font-normal">(optional — defaults to stu-&lt;rollNumber&gt;)</span>}
                </label>
                <Input
                  placeholder={formRole === 'student' ? 'Auto-generated if blank (e.g. stu-24B91A0799)' : 'e.g. fac-002'}
                  value={formId}
                  onChange={e => setFormId(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <Input
                  placeholder="e.g. Arjun Sharma"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@college.edu"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">System Role</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as api.UserRole)}
                  className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="hod">HOD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
                <select
                  value={formDept}
                  onChange={e => setFormDept(e.target.value)}
                  className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                >
                  <option value="CSD">CSD</option>
                  <option value="CSIT">CSIT</option>
                </select>
              </div>
            </div>

            {formRole === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Roll Number</label>
                  <Input
                    placeholder="e.g. 24B91A0799"
                    value={formRoll}
                    onChange={e => setFormRoll(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Semester</label>
                  <select
                    value={formSem}
                    onChange={e => setFormSem(Number(e.target.value))}
                    className="w-full h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 text-[13px]"
                  >
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Password {editingUser ? <span className="text-[10px] text-slate-400">(leave blank to keep current)</span> : formRole === 'student' && <span className="text-[10px] text-slate-400 font-normal">(optional — defaults to roll number)</span>}
              </label>
              <Input
                type="text"
                placeholder={editingUser ? 'Leave blank to keep current' : formRole === 'student' ? 'Defaults to Roll Number if blank' : 'Enter login password'}
                value={formPass}
                onChange={e => setFormPass(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Avatar Image URL <span className="text-[10px] text-slate-400 font-normal">(optional photo link)</span>
              </label>
              <Input
                type="text"
                placeholder="https://srkrexams.in/SRKR/photo/24B91A0702.jpg"
                value={formAvatar}
                onChange={e => setFormAvatar(e.target.value)}
              />
            </div>

            {formError && (
              <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowFormModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                {editingUser ? 'Save Updates' : 'Add User'}
              </Button>
            </div>
          </form>
        </Modal>

      </div>
    </PageWrapper>
  );
}
