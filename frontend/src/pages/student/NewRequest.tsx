import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { UploadArea } from '../../components/forms/UploadArea';
import * as api from '../../lib/api';
import {
  ArrowLeft, CalendarDays, Clock, FileText, Upload,
  BookOpen, PenLine, Send, UserCheck, ChevronDown
} from 'lucide-react';

const schema = z
  .object({
    reason: z.string().min(1, 'Please select a reason'),
    facultyId: z.string().optional(),
    date: z.string().min(1, 'Please select a date'),
    startTime: z.string().min(1, 'Please enter start time'),
    endTime: z.string().min(1, 'Please enter end time'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(500, 'Description must be under 500 characters'),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

type FormData = z.infer<typeof schema>;

const reasonOptions = [
  { value: 'internship', label: 'Internship' },
  { value: 'medical', label: 'Medical Leave' },
  { value: 'sports', label: 'Sports Event' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'competition', label: 'Competition' },
  { value: 'other', label: 'Other' },
];

const card = (extra: object = {}) => ({
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #EEF2F7',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  ...extra,
});

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  height: 46, padding: '0 14px 0 40px',
  fontSize: 14, color: '#1E293B',
  background: '#F8FAFC', border: '1.5px solid #E8EDF2',
  borderRadius: 12, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

export default function NewRequest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
<<<<<<< HEAD
  const [showAllFaculty, setShowAllFaculty] = useState(false);
=======
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
>>>>>>> 48d01b9 (feat: Faculty/HOD Passkey authentication, 4-digit passcode, mobile login responsiveness, student photo avatars, ABC ordered faculty dropdowns, and proof document display)

  const { data: rawFacultyList = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => api.getFaculty(),
  });

<<<<<<< HEAD
  const sortedFacultyList = [...facultyList].sort((a, b) => a.name.localeCompare(b.name));
  const visibleFacultyList = showAllFaculty ? sortedFacultyList : sortedFacultyList.slice(0, 3);
=======
  const facultyList = [...rawFacultyList].sort((a: api.Faculty, b: api.Faculty) =>
    a.name.localeCompare(b.name)
  );
>>>>>>> 48d01b9 (feat: Faculty/HOD Passkey authentication, 4-digit passcode, mobile login responsiveness, student photo avatars, ABC ordered faculty dropdowns, and proof document display)

  const toggleFaculty = (id: string) => {
    setSelectedFacultyIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const getHourLaterTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toTimeString().slice(0, 5);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      facultyId: '',
      date: getTodayDate(),
      startTime: getCurrentTime(),
      endTime: getHourLaterTime(),
      description: ''
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.createRequest({
      reason: data.reason as api.RequestReason,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description,
      ...(selectedFacultyIds.length > 0
        ? { facultyIds: selectedFacultyIds, facultyId: selectedFacultyIds[0] }
        : data.facultyId
          ? { facultyId: data.facultyId, facultyIds: [data.facultyId] }
          : {}),
      ...(file ? { documentName: file.name } : {}),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate('/student/success');
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const isSubmitting = mutation.isPending;

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#F97316';
    e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)';
    e.target.style.background = '#fff';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E8EDF2';
    e.target.style.boxShadow = 'none';
    e.target.style.background = '#F8FAFC';
  };

  return (
    <PageWrapper role="student">
      <div style={{ maxWidth: 720 }}>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}
        >
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
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>New Attendance Request</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Fill in the details below to submit your request</p>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.05 }}
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >

          {/* Section 1 — Reason */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Reason for Absence</h2>
            </div>

            <label style={labelStyle}>Select Reason</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <BookOpen size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <select
                {...register('reason')}
                onFocus={focusStyle as any}
                onBlur={blurStyle as any}
                style={{ ...inputStyle, appearance: 'none', paddingRight: 36, cursor: 'pointer' }}
              >
                <option value="">Select a reason...</option>
                {reasonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {errors.reason && <p style={{ fontSize: 12, color: '#DC2626', margin: '-10px 0 12px' }}>{errors.reason.message}</p>}

            {/* Target Faculty — Dropdown Box with Avatars */}
            <label style={labelStyle}>
              Point to Faculty Member(s) <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>(Select from dropdown: Class Mentor, Counselor, Subject Teacher)</span>
            </label>

            {/* Custom Dropdown Trigger Box */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div
                onClick={() => setIsDropdownOpen(prev => !prev)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  minHeight: 50, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#F8FAFC', border: isDropdownOpen ? '1.5px solid #F97316' : '1.5px solid #E8EDF2',
                  borderRadius: 14, cursor: 'pointer',
                  boxShadow: isDropdownOpen ? '0 0 0 3px rgba(249,115,22,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {selectedFacultyIds.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {selectedFacultyIds.map(fId => {
                      const fac = facultyList.find((f: api.Faculty) => f.id === fId);
                      if (!fac) return null;
                      return (
                        <div
                          key={fac.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '4px 10px 4px 6px', background: '#FFF7ED',
                            border: '1px solid #FED7AA', borderRadius: 10,
                          }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 8, overflow: 'hidden', background: '#EA580C', flexShrink: 0 }}>
                            <img
                              src={fac.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fac.name)}&background=F97316&color=fff`}
                              alt={fac.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{fac.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                            {fac.department}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8' }}>
                    <UserCheck size={18} style={{ color: '#94A3B8' }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Select Faculty Member from dropdown...</span>
                  </div>
                )}
                <ChevronDown size={18} style={{ color: '#64748B', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 8 }} />
              </div>

              {/* Dropdown Options List */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      marginTop: 6, zIndex: 40,
                      background: '#ffffff', border: '1.5px solid #E8EDF2',
                      borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      maxHeight: 280, overflowY: 'auto', padding: 6,
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    {facultyList.map((f: api.Faculty, idx: number) => {
                      const isSelected = selectedFacultyIds.includes(f.id);
                      const designationTag = f.designation || (idx % 3 === 0 ? 'Class Mentor' : idx % 3 === 1 ? 'Counselor' : 'Subject Faculty');
                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            toggleFaculty(f.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                            background: isSelected ? '#FFF7ED' : 'transparent',
                            border: isSelected ? '1px solid #FED7AA' : '1px solid transparent',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', background: '#EA580C', flexShrink: 0, border: '1px solid #FED7AA' }}>
                              <img
                                src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=F97316&color=fff`}
                                alt={f.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=F97316&color=fff`;
                                }}
                              />
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{f.name}</p>
                              <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{f.department} · {designationTag}</p>
                            </div>
                          </div>
                          <div style={{
                            width: 18, height: 18, borderRadius: 6,
                            border: isSelected ? 'none' : '1.5px solid #CBD5E1',
                            background: isSelected ? '#F97316' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 11, fontWeight: 800,
                          }}>
                            {isSelected && '✓'}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {sortedFacultyList.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllFaculty(!showAllFaculty)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '9px 14px',
                  marginBottom: 10,
                  borderRadius: 10,
                  border: '1px dashed #CBD5E1',
                  background: '#F8FAFC',
                  color: '#F97316',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{showAllFaculty ? 'Show Less' : `View More (${sortedFacultyList.length - 3} more faculty)`}</span>
                <ChevronDown size={14} style={{ transform: showAllFaculty ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '5px 0 0' }}>
              Only selected faculty members (e.g. Class Mentor, Counselor, Subject Teacher) will be authorized to view &amp; approve your request.
            </p>
          </div>

          {/* Section 2 — Date & Time */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Date &amp; Duration</h2>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Date</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="date"
                  {...register('date')}
                  min={new Date().toISOString().split('T')[0]}
                  onFocus={focusStyle as any}
                  onBlur={blurStyle as any}
                  style={inputStyle}
                />
              </div>
              {errors.date && <p style={{ fontSize: 12, color: '#DC2626', margin: '5px 0 0' }}>{errors.date.message}</p>}
            </div>

            {/* Start / End Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Start Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                  <input type="time" {...register('startTime')} onFocus={focusStyle as any} onBlur={blurStyle as any} style={inputStyle} />
                </div>
                {errors.startTime && <p style={{ fontSize: 12, color: '#DC2626', margin: '5px 0 0' }}>{errors.startTime.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                  <input type="time" {...register('endTime')} onFocus={focusStyle as any} onBlur={blurStyle as any} style={inputStyle} />
                </div>
                {errors.endTime && <p style={{ fontSize: 12, color: '#DC2626', margin: '5px 0 0' }}>{errors.endTime.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 3 — Description */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PenLine size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Description</h2>
            </div>

            <label style={labelStyle}>Describe your absence in detail</label>
            <textarea
              {...register('description')}
              placeholder="Provide a detailed explanation of why you were absent..."
              rows={5}
              onFocus={focusStyle as any}
              onBlur={blurStyle as any}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                borderRadius: 12, outline: 'none', resize: 'vertical',
                lineHeight: 1.6, fontFamily: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '5px 0 0' }}>Minimum 20 characters</p>
            {errors.description && <p style={{ fontSize: 12, color: '#DC2626', margin: '4px 0 0' }}>{errors.description.message}</p>}
          </div>

          {/* Section 4 — Document */}
          <div style={{ ...card({ padding: '22px 24px' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={14} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Supporting Document <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400 }}>(Optional)</span></h2>
            </div>
            <UploadArea file={file} onFileSelect={setFile} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                flex: 1, height: 48, borderRadius: 13,
                background: '#F8FAFC', border: '1.5px solid #E8EDF2',
                color: '#64748B', fontSize: 14, fontWeight: 700, cursor: 'pointer',
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
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(249,115,22,0.30)',
                transition: 'all 0.15s',
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageWrapper>
  );
}
