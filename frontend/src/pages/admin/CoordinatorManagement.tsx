import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  Copy,
  Check,
  Search,
  AlertCircle,
  X,
  Key,
  Briefcase,
  Rocket,
  Code,
  Trophy,
  Award
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type { CoordinatorAccess, ActivityCategory } from '../../lib/api';

const CATEGORY_LABELS: Record<ActivityCategory, { label: string; icon: any; color: string; bg: string }> = {
  internship:   { label: 'Internship', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  startup:      { label: 'Startups', icon: Rocket, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  project_work: { label: 'Project Work', icon: Code, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  sports:       { label: 'Sports', icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  house_events: { label: 'House Events', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};

export default function CoordinatorManagement() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Form State for New Assignment
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [facultySearch, setFacultySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('internship');
  const [customCodeInput, setCustomCodeInput] = useState('');

  // Generated Code Display Modal State
  const [generatedCodeResult, setGeneratedCodeResult] = useState<{
    code: string;
    facultyName: string;
    category: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: coordinators = [], isLoading } = useQuery({
    queryKey: ['admin-coordinators'],
    queryFn: () => api.getCoordinators(),
  });

  const { data: facultyMembers = [] } = useQuery({
    queryKey: ['faculty-roster'],
    queryFn: async () => {
      try {
        const users = await api.getUsers('faculty');
        const hods = await api.getUsers('hod');
        const combined = [...users, ...hods];
        return combined.filter((u: any) => u.role === 'faculty' || u.role === 'hod');
      } catch {
        return [];
      }
    },
    enabled: isAssignModalOpen,
  });

  const filteredFaculty = useMemo(() => {
    const onlyFaculty = facultyMembers.filter((f: any) => f.role === 'faculty' || f.role === 'hod');
    if (!facultySearch.trim()) return onlyFaculty.slice(0, 10);
    const q = facultySearch.toLowerCase().trim();
    return onlyFaculty.filter((f: any) =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q) ||
      (f.department || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [facultyMembers, facultySearch]);

  const filteredCoordinators = useMemo(() => {
    if (!search.trim()) return coordinators;
    const q = search.toLowerCase().trim();
    return coordinators.filter((c: CoordinatorAccess) =>
      (c.faculty?.name || '').toLowerCase().includes(q) ||
      (c.faculty?.department || '').toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [coordinators, search]);

  // Assign Coordinator Mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFaculty) throw new Error('Please select a faculty member.');
      return api.assignCoordinator(selectedFaculty.userId || selectedFaculty.id, selectedCategory, customCodeInput);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coordinators'] });
      setIsAssignModalOpen(false);
      setCustomCodeInput('');
      setGeneratedCodeResult({
        code: res.generatedCode,
        facultyName: res.coordinator.faculty?.name || 'Faculty Member',
        category: res.coordinator.category,
      });
      showToast('success', res.message);
    },
    onError: (err: any) => {
      showToast('error', err.message || 'Failed to assign coordinator.');
    }
  });

  // Regenerate Code Mutation
  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.regenerateCoordinatorCode(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coordinators'] });
      setGeneratedCodeResult({
        code: res.generatedCode,
        facultyName: res.coordinator.faculty?.name || 'Faculty Member',
        category: res.coordinator.category,
      });
      showToast('success', 'Authorization code regenerated. Old code is now invalid.');
    },
    onError: (err: any) => {
      showToast('error', err.message || 'Failed to regenerate code.');
    }
  });

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api.toggleCoordinatorStatus(id, isActive);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coordinators'] });
      showToast('success', res.message);
    },
    onError: (err: any) => {
      showToast('error', err.message || 'Failed to update status.');
    }
  });

  // Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.revokeCoordinator(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coordinators'] });
      showToast('success', res.message);
    },
    onError: (err: any) => {
      showToast('error', err.message || 'Failed to revoke coordinator.');
    }
  });

  const handleCopyCode = () => {
    if (!generatedCodeResult) return;
    navigator.clipboard.writeText(generatedCodeResult.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
            <ShieldCheck size={14} />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Coordinator Access Management</h1>
          <p className="text-xs text-slate-500 font-medium">
            Designate faculty coordinators, generate unique authorization codes, and manage activity permissions.
          </p>
        </div>

        <button
          onClick={() => { setSelectedFaculty(null); setFacultySearch(''); setIsAssignModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-500/20 transition self-start md:self-auto"
        >
          <Plus size={15} />
          <span>Assign New Coordinator</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search coordinator by faculty name or category..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Coordinators Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading coordinator assignments...</span>
          </div>
        ) : filteredCoordinators.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <UserCheck size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Coordinator Access Assignments</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No faculty members are currently assigned as category coordinators. Click below to assign one.
            </p>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              <Plus size={14} />
              <span>Assign Coordinator</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Permitted Category</th>
                  <th className="py-3.5 px-4">Authorization Code</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Assigned On</th>
                  <th className="py-3.5 px-4 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCoordinators.map((c: CoordinatorAccess) => {
                  const catConfig = CATEGORY_LABELS[c.category] || CATEGORY_LABELS.internship;
                  const CatIcon = catConfig.icon;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      {/* Faculty Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-xs border border-slate-200 shrink-0">
                            {(c.faculty?.name || 'F').charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{c.faculty?.name || 'Faculty'}</p>
                            <p className="text-[11px] text-slate-500">{c.faculty?.department || 'Department'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Permitted Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${catConfig.bg} ${catConfig.color}`}>
                          <CatIcon size={13} />
                          <span>{catConfig.label}</span>
                        </span>
                      </td>

                      {/* Code Display */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {c.codeMasked}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {c.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Assigned Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11.5px] font-mono">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => regenerateMutation.mutate(c.id)}
                            title="Regenerate Authorization Code (Invalidates old code)"
                            disabled={regenerateMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition"
                          >
                            <RefreshCw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                          </button>

                          <button
                            onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                            title={c.isActive ? 'Disable Access' : 'Enable Access'}
                            className={`p-1.5 rounded-lg transition border border-transparent ${
                              c.isActive
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                            }`}
                          >
                            <Power size={14} />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Revoke coordinator access for ${c.faculty?.name} (${c.category})?`)) {
                                revokeMutation.mutate(c.id);
                              }
                            }}
                            title="Revoke Coordinator Access"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal 1: Assign Coordinator Modal ── */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                    <UserCheck size={18} />
                  </div>
                  <span>Assign Faculty Coordinator</span>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Select Faculty Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Faculty Member</label>
                {selectedFaculty ? (
                  <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-xs">{selectedFaculty.name}</p>
                      <p className="text-[11px] text-slate-500">{selectedFaculty.department} • {selectedFaculty.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFaculty(null)}
                      className="text-xs font-bold text-orange-700 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={facultySearch}
                        onChange={e => setFacultySearch(e.target.value)}
                        placeholder="Search faculty by name or department..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                      {filteredFaculty.map((f: any) => (
                        <button
                          key={f.id || f.userId}
                          type="button"
                          onClick={() => setSelectedFaculty(f)}
                          className="w-full text-left p-2.5 hover:bg-orange-50 flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{f.name}</span>
                            <span className="text-[11px] text-slate-500 ml-2">({f.department})</span>
                          </div>
                          <span className="text-[10.5px] font-bold text-orange-600">Select</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Select Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Permitted Activity Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as ActivityCategory)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                >
                  {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat].label}</option>
                  ))}
                </select>
              </div>

              {/* Custom Authorization Code / PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Custom Authorization Code (Optional)</label>
                <input
                  type="text"
                  value={customCodeInput}
                  onChange={e => setCustomCodeInput(e.target.value)}
                  placeholder="e.g. SOMA1234, GOWT5829 (Leave blank to auto-generate name combo)"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Auto-generated format: 4 letters derived from faculty name + 4 random digits (e.g. <strong>SOMA1234</strong> or <strong>GOWT5829</strong>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedFaculty || assignMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md shadow-orange-500/20 transition disabled:opacity-50"
                >
                  {assignMutation.isPending ? 'Generating Code...' : 'Assign & Generate Code'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Generated Authorization Code Display Modal ── */}
      <AnimatePresence>
        {generatedCodeResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="p-3 rounded-full bg-emerald-50 border border-emerald-200">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Unique Authorization Code Generated</h3>
                  <p className="text-xs text-slate-500 font-medium">Provide this code securely to the designated coordinator.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Coordinator Code</p>
                <p className="text-xl font-mono font-black text-orange-400 tracking-wider select-all">
                  {generatedCodeResult.code}
                </p>
                <p className="text-[11px] text-slate-400">
                  Assigned to: <strong>{generatedCodeResult.facultyName}</strong> ({generatedCodeResult.category.toUpperCase()})
                </p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed italic">
                Notice: For security reasons, this authorization code will not be shown again in plain text. Please copy and share it directly with the faculty member.
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedCodeResult(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
