import mongoose, { Schema, type Document } from 'mongoose';
import type { RequestReason, RequestStatus } from '../types.js';

// ── Embedded sub-documents ─────────────────────────────────────────────────────

const StudentSnapshotSchema = new Schema(
  {
    id:         { type: String, required: true },
    name:       { type: String, required: true },
    rollNumber: { type: String, required: true },
    department: { type: String, required: true },
    semester:   { type: Number, required: true },
    email:      { type: String, required: true },
    avatarUrl:  { type: String },
  },
  { _id: false },
);

const FacultySnapshotSchema = new Schema(
  {
    id:         { type: String, required: true },
    name:       { type: String, required: true },
    department: { type: String, required: true },
    email:      { type: String, required: true },
  },
  { _id: false },
);

// ── Main Request document ───────────────────────────────────────────────────────

export interface IRequest extends Document {
  requestId:       string;   // human-readable (req-001, req-002 …)
  studentId:       string;
  student?:        { id: string; name: string; rollNumber: string; department: string; semester: number; email: string; avatarUrl?: string };
  reason:          RequestReason;
  reasonLabel:     string;
  date:            string;
  startTime:       string;
  endTime:         string;
  description:     string;
  documentName?:   string;
  status:          RequestStatus;
  submittedAt:     string;
  facultyId?:      string;
  faculty?:        { id: string; name: string; department: string; email: string };
  reviewedAt?:     string;
  rejectionReason?: string;
}

const RequestSchema = new Schema<IRequest>(
  {
    requestId:       { type: String, required: true, unique: true },
    studentId:       { type: String, required: true },
    student:         { type: StudentSnapshotSchema },
    reason:          { type: String, required: true },
    reasonLabel:     { type: String, required: true },
    date:            { type: String, required: true },
    startTime:       { type: String, required: true },
    endTime:         { type: String, required: true },
    description:     { type: String, required: true },
    documentName:    { type: String },
    status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt:     { type: String, required: true },
    facultyId:       { type: String },
    faculty:         { type: FacultySnapshotSchema },
    reviewedAt:      { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

// Index for fast student-scoped queries
RequestSchema.index({ studentId: 1 });
RequestSchema.index({ status: 1 });
RequestSchema.index({ submittedAt: -1 });

export const RequestModel = mongoose.model<IRequest>('Request', RequestSchema);
