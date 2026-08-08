import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText, Check, Upload, PenLine, User, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRequest } from '../../types';
import { Button } from '../ui/Button';
import { UploadArea } from '../forms/UploadArea';
import * as api from '../../lib/api';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/65 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20 text-lg">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">Edit Permission Request</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                  {request.publicId || request.requestId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Update details and submit changes to your assigned faculty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - 2 Column Grid */}
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left Column — Reason, Type, Dates & Periods */}
            <div className="space-y-6">

              {/* Reason */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <PenLine size={16} className="text-orange-500" />
                  <span>Absence Reason</span>
                </div>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value as api.RequestReason)}
                  className="w-full h-12 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-orange-500 shadow-sm"
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

              {/* Request Type Toggle */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Clock size={16} className="text-orange-500" />
                  <span>Request Type</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRequestType('permission')}
                    className={`py-2.5 text-xs font-bold rounded-lg border-none cursor-pointer transition-all ${requestType === 'permission' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600'}`}
                  >
                    Single Day Permission
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('leave')}
                    className={`py-2.5 text-xs font-bold rounded-lg border-none cursor-pointer transition-all ${requestType === 'leave' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600'}`}
                  >
                    Multi-Day Leave
                  </button>
                </div>

                {/* Dates & Periods */}
                {requestType === 'permission' ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date of Absence</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Absent Periods</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                          const isSel = selectedPeriods.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => togglePeriod(p)}
                              className={`h-11 rounded-xl text-xs font-extrabold border-none cursor-pointer transition-all ${isSel ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            >
                              P{p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <FileText size={16} className="text-orange-500" />
                  <span>Detailed Explanation</span>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Explain why you were absent..."
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500 resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Right Column — Faculty Assignment & Proof Upload */}
            <div className="space-y-6 flex flex-col justify-between">

              {/* Faculty Reviewers Grid */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <User size={16} className="text-orange-500" />
                    <span>Assigned Faculty Members</span>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                    {selectedFacultyIds.length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {facultyList.map(f => {
                    const fId = f.id || f.userId || '';
                    const isSelected = !!fId && selectedFacultyIds.includes(fId);
                    return (
                      <div
                        key={fId}
                        onClick={() => toggleFaculty(fId)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'border-orange-500 bg-orange-50/80 shadow-sm' : 'border-slate-200/80 bg-white hover:border-slate-300'}`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            {f.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-500">{f.department || 'CSIT'}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-orange-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proof Document Upload */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Upload size={16} className="text-orange-500" />
                  <span>Supporting Proof Document</span>
                </div>

                {request.documentUrl && !file && (
                  <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-orange-700 uppercase text-[10px]">Attached Proof</p>
                      <p className="font-bold text-slate-900 truncate max-w-[220px]">{request.documentName || 'Proof Document'}</p>
                    </div>
                    <span className="text-[11px] font-bold text-orange-600 bg-white px-2 py-1 rounded-lg border border-orange-200">Existing Link Saved</span>
                  </div>
                )}

                <UploadArea file={file} onFileSelect={setFile} />
              </div>

              {mutation.isError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                  {(mutation.error as Error)?.message || 'Failed to save changes.'}
                </div>
              )}
            </div>

          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 border-none cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold text-sm hover:from-orange-600 hover:to-orange-700 border-none cursor-pointer shadow-lg shadow-orange-500/25 transition-all"
            >
              {mutation.isPending ? 'Saving Request Updates...' : 'Save & Update Permission Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
