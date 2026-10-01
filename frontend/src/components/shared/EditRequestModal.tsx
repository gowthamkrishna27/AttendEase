import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, PenLine, User, Calendar, Paperclip } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRequest } from '../../types';
import { UploadArea } from '../forms/UploadArea';
import * as api from '../../lib/api';
import { getFacultyInitials } from '../../lib/utils';

interface EditRequestModalProps {
  request: AttendanceRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditRequestModal: React.FC<EditRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const { data: rawFacultyList = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => api.getFaculty(),
    enabled: isOpen,
  });

  const facultyList = (Array.isArray(rawFacultyList) ? rawFacultyList : [])
    .filter(f => f && f.name)
    .sort((a: api.Faculty, b: api.Faculty) =>
      (a.name || '').localeCompare(b.name || '')
    );

  // Form State
  const [reason, setReason] = useState<api.RequestReason>('medical');
  const [requestType, setRequestType] = useState<'permission' | 'leave'>('permission');
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([1, 2]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (request && isOpen) {
      setReason(request.reason);
      setDescription(request.description || '');
      setStartDate(request.date || new Date().toISOString().split('T')[0]);
      if (request.endDate) {
        setEndDate(request.endDate);
        setRequestType('leave');
      } else {
        setRequestType('permission');
      }

      if (request.periods) {
        const parsed = request.periods.split(',').map(p => parseInt(p.trim())).filter(n => !isNaN(n));
        if (parsed.length > 0) setSelectedPeriods(parsed);
      }

      const initialIds: string[] = [];
      if (request.facultyIds && Array.isArray(request.facultyIds)) {
        request.facultyIds.forEach((fId: any) => {
          if (fId && typeof fId === 'string') initialIds.push(fId);
        });
      }
      if (initialIds.length === 0) {
        const pId = request.facultyId || request.primaryFacultyId || (request.faculty?.id);
        if (pId && typeof pId === 'string') initialIds.push(pId);
      }
      setSelectedFacultyIds(initialIds);
    }
  }, [request, isOpen]);

  const togglePeriod = (pId: number) => {
    setSelectedPeriods(prev =>
      prev.includes(pId) ? prev.filter(p => p !== pId) : [...prev, pId].sort((a, b) => a - b)
    );
  };

  const toggleFaculty = (fId: string) => {
    setSelectedFacultyIds(prev =>
      prev.includes(fId) ? prev.filter(id => id !== fId) : [...prev, fId]
    );
  };

  const computedTimeRange = useMemo(() => {
    if (requestType === 'leave') {
      return { start: '09:00 AM', end: '04:30 PM', periodsStr: '1,2,3,4,5,6,7,8' };
    }
    if (selectedPeriods.length === 0) {
      return { start: '09:00 AM', end: '10:30 AM', periodsStr: '1,2' };
    }
    const timesMap: Record<number, { start: string; end: string }> = {
      1: { start: '09:00 AM', end: '09:45 AM' },
      2: { start: '09:45 AM', end: '10:30 AM' },
      3: { start: '10:30 AM', end: '11:15 AM' },
      4: { start: '11:15 AM', end: '12:00 PM' },
      5: { start: '01:30 PM', end: '02:15 PM' },
      6: { start: '02:15 PM', end: '03:00 PM' },
      7: { start: '03:00 PM', end: '03:45 PM' },
      8: { start: '03:45 PM', end: '04:30 PM' },
    };
    const sorted = [...selectedPeriods].sort((a, b) => a - b);
    const minP = sorted[0];
    const maxP = sorted[sorted.length - 1];
    return {
      start: timesMap[minP]?.start || '09:00 AM',
      end: timesMap[maxP]?.end || '12:00 PM',
      periodsStr: sorted.join(','),
    };
  }, [requestType, selectedPeriods]);

  const mutation = useMutation({
    mutationFn: async () => {
      let uploadedDocUrl = request?.documentUrl || '';
      let uploadedDocName = request?.documentName || '';

      if (file) {
        const uploaded = await api.uploadProofDocument(file);
        if (uploaded.url) {
          uploadedDocUrl = uploaded.url;
          uploadedDocName = uploaded.name || file.name;
        }
      }

      return api.updateRequest(request!.id, {
        reason,
        date: startDate,
        ...(requestType === 'leave' && endDate ? { endDate } : {}),
        periods: computedTimeRange.periodsStr,
        startTime: computedTimeRange.start,
        endTime: computedTimeRange.end,
        description,
        ...(selectedFacultyIds.length > 0
          ? { facultyIds: selectedFacultyIds, facultyId: selectedFacultyIds[0] }
          : {}),
        ...(uploadedDocName ? { documentName: uploadedDocName } : {}),
        ...(uploadedDocUrl ? { documentUrl: uploadedDocUrl } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['request', request?.id] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  if (!isOpen || !request) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/70 flex items-center justify-center font-bold shrink-0">
              <PenLine size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Edit Request</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-100/80 text-orange-700">
                  {request.publicId || request.requestId}
                </span>
              </div>
              <p className="text-[12px] text-slate-400">Update request details and assigned faculty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[75vh]">
          
          {/* Reason & Type in a Clean 2-Column Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
                Absence Reason
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as api.RequestReason)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="medical">Medical Leave</option>
                <option value="internship">Internship / Off-Campus</option>
                <option value="startup">Startup Work</option>
                <option value="project_development">Project Development</option>
                <option value="sports">Sports Event</option>
                <option value="competition">Hackathon / Competition</option>
                <option value="family_emergency">Family Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
                Duration Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl h-11">
                <button
                  type="button"
                  onClick={() => setRequestType('permission')}
                  className={`text-[12px] font-bold rounded-lg border-none cursor-pointer transition-all flex items-center justify-center ${requestType === 'permission' ? 'bg-white text-orange-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('leave')}
                  className={`text-[12px] font-bold rounded-lg border-none cursor-pointer transition-all flex items-center justify-center ${requestType === 'leave' ? 'bg-white text-orange-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Multi-Day Leave
                </button>
              </div>
            </div>
          </div>

          {/* Date & Period Controls */}
          {requestType === 'permission' ? (
            <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[11.5px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-orange-500" />
                  Date of Absence
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Periods ({selectedPeriods.length} selected)
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                    const isSel = selectedPeriods.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePeriod(p)}
                        className={`h-9 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center ${isSel ? 'bg-orange-500 text-white border-orange-500 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        P{p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Detailed Reason Explanation */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
              Reason Details & Explanation
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide context or explanation for your request..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white resize-none transition-all"
            />
          </div>

          {/* Assigned Faculty Reviewers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-orange-500" />
                Assigned Faculty Reviewers
              </label>
              <span className="text-[11px] font-bold text-orange-600">
                {selectedFacultyIds.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-0.5">
              {facultyList.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-slate-400 text-xs">
                  No faculty available
                </div>
              ) : (
                facultyList.map(f => {
                  const fId = f.id || f.userId || '';
                  const isSelected = !!fId && selectedFacultyIds.includes(fId);
                  return (
                    <div
                      key={fId}
                      onClick={() => toggleFaculty(fId)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all select-none ${isSelected ? 'border-orange-400 bg-orange-50/70 text-orange-950 font-bold' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <div className="min-w-0 flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {f.avatarUrl ? (
                            <img
                              src={f.avatarUrl}
                              alt={f.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerText = getFacultyInitials(f.name);
                                }
                              }}
                            />
                          ) : (
                            getFacultyInitials(f.name)
                          )}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-900 truncate block">{f.name}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-orange-600 shrink-0 ml-2" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Proof Document Section */}
          <div className="space-y-2">
            <label className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip size={13} className="text-orange-500" />
              Proof Document
            </label>

            {request.documentUrl && !file && (
              <div className="p-2.5 bg-orange-50/60 border border-orange-200 rounded-xl text-xs flex items-center justify-between">
                <span className="font-bold text-slate-800 truncate max-w-[260px]">
                  {request.documentName || 'Attached_Proof_Document'}
                </span>
                <span className="text-[10.5px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200">
                  Current Proof Attached
                </span>
              </div>
            )}

            <UploadArea file={file} onFileSelect={setFile} />
          </div>

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
              {(mutation.error as Error)?.message || 'Failed to save changes.'}
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-600 font-bold text-[13px] hover:bg-slate-200 border-none cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-[2] h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[13px] border-none cursor-pointer shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all"
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
