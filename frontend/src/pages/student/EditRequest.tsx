import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, PenLine, ShieldAlert, Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { UploadArea } from '../../components/forms/UploadArea';
import * as api from '../../lib/api';

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#ffffff',
  borderRadius: 18,
  border: '1px solid #E8EDF2',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
  marginBottom: 20,
  ...extra,
});

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

export default function EditRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.getRequest(id!),
    enabled: !!id,
  });

  const { data: rawFacultyList = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => api.getFaculty(),
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
  const [showAllFaculty, setShowAllFaculty] = useState(false);

  // Pre-populate state when request loads
  useEffect(() => {
    if (request) {
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
  }, [request]);

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

      return api.updateRequest(id!, {
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
      void queryClient.invalidateQueries({ queryKey: ['request', id] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate(`/student/request/${id}`);
    },
  });

  if (isLoading) {
    return (
      <PageWrapper role="student">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 14 }}>Loading request data...</div>
      </PageWrapper>
    );
  }

  if (isError || !request) {
    return (
      <PageWrapper role="student">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-[16px] text-[#6B7280]">Request not found.</p>
          <Button className="mt-4" onClick={() => navigate('/student/history')}>
            Back to History
          </Button>
        </div>
      </PageWrapper>
    );
  }

  if (request.status === 'approved') {
    return (
      <PageWrapper role="student">
        <div className="max-w-xl mx-auto text-center py-20 bg-orange-50 border border-orange-200 rounded-2xl p-8">
          <ShieldAlert className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Request Approved</h2>
          <p className="text-sm text-slate-600 mb-6">Approved attendance permission requests cannot be edited by students.</p>
          <Button onClick={() => navigate(`/student/request/${id}`)}>View Request Details</Button>
        </div>
      </PageWrapper>
    );
  }

  const isSubmitting = mutation.isPending;

  return (
    <PageWrapper role="student">
      <div style={{ maxWidth: 720 }}>
        {/* Top Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 38, height: 38, borderRadius: 11, border: '1px solid #E8EDF2',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748B', flexShrink: 0,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>Edit Attendance Request</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Update details for request <span style={{ fontWeight: 700, color: '#F97316' }}>{request.publicId || request.requestId}</span>
            </p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>

          {/* Section 1 — Reason & Faculty */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PenLine size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Reason & Assigned Faculty</h2>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Reason for Absence</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as api.RequestReason)}
                style={{
                  width: '100%', height: 46, padding: '0 14px', fontSize: 14, color: '#1E293B',
                  background: '#F8FAFC', border: '1.5px solid #E8EDF2', borderRadius: 12, outline: 'none'
                }}
              >
                <option value="medical">Medical Leave</option>
                <option value="internship">Internship / Off-Campus</option>
                <option value="sports">Sports Event</option>
                <option value="competition">Hackathon / Competition</option>
                <option value="family_emergency">Family Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Faculty Selection */}
            <div>
              <label style={labelStyle}>Assigned Faculty Reviewers ({selectedFacultyIds.length} selected)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 10 }}>
                {(showAllFaculty ? facultyList : facultyList.slice(0, 6)).map(f => {
                  const fId = f.id || f.userId || '';
                  const isSelected = !!fId && selectedFacultyIds.includes(fId);
                  return (
                    <div
                      key={fId}
                      onClick={() => toggleFaculty(fId)}
                      style={{
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        border: isSelected ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF7ED' : '#F8FAFC',
                        display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{f.name.slice(0, 2)}</span>}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                        <p style={{ fontSize: 10, color: '#64748B', margin: 0 }}>{f.department || 'CSIT'}</p>
                      </div>
                      {isSelected && <Check size={14} style={{ color: '#F97316', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
              {facultyList.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllFaculty(!showAllFaculty)}
                  style={{ marginTop: 10, background: 'none', border: 'none', color: '#F97316', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {showAllFaculty ? 'Show Less' : `+ Show All ${facultyList.length} Faculty Members`}
                </button>
              )}
            </div>
          </div>

          {/* Section 2 — Dates & Time Range */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Schedule & Periods</h2>
            </div>

            <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 4, borderRadius: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setRequestType('permission')}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: requestType === 'permission' ? '#ffffff' : 'transparent',
                  color: requestType === 'permission' ? '#F97316' : '#64748B',
                  boxShadow: requestType === 'permission' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Single Day Permission
              </button>
              <button
                type="button"
                onClick={() => setRequestType('leave')}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: requestType === 'leave' ? '#ffffff' : 'transparent',
                  color: requestType === 'leave' ? '#F97316' : '#64748B',
                  boxShadow: requestType === 'leave' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Multi-Day Leave
              </button>
            </div>

            {requestType === 'permission' ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Date of Absence</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ width: '100%', height: 46, padding: '0 14px', fontSize: 14, background: '#F8FAFC', border: '1.5px solid #E8EDF2', borderRadius: 12, outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Select Periods Absent</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                      const isSel = selectedPeriods.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePeriod(p)}
                          style={{
                            height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                            background: isSel ? '#F97316' : '#F1F5F9',
                            color: isSel ? '#ffffff' : '#475569',
                            transition: 'all 0.15s'
                          }}
                        >
                          P{p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ width: '100%', height: 46, padding: '0 14px', fontSize: 14, background: '#F8FAFC', border: '1.5px solid #E8EDF2', borderRadius: 12, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    style={{ width: '100%', height: 46, padding: '0 14px', fontSize: 14, background: '#F8FAFC', border: '1.5px solid #E8EDF2', borderRadius: 12, outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3 — Description */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <label style={labelStyle}>Description / Explanation</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Explain the detailed reason for your absence..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', border: '1.5px solid #E8EDF2', borderRadius: 12, outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          {/* Section 4 — Proof Document Upload */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <label style={labelStyle}>Supporting Proof Document</label>
            {request.documentUrl && !file && (
              <div style={{ padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#EA580C', margin: 0, textTransform: 'uppercase' }}>Current Document Attached</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '2px 0 0' }}>{request.documentName || 'Proof Document'}</p>
                </div>
              </div>
            )}
            <UploadArea file={file} onFileSelect={setFile} />
          </div>

          {/* Error Notice */}
          {mutation.isError && (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#DC2626', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {(mutation.error as Error)?.message || 'Failed to update request.'}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                flex: 1, height: 48, borderRadius: 13, background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                color: '#64748B', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2, height: 48, borderRadius: 13,
                background: isSubmitting ? '#FED7AA' : 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(249,115,22,0.30)'
              }}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save & Update Request'}
            </button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
