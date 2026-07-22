import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;          // human-readable id (e.g. stu-001)
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod';
  department: string;
  password: string;
  rollNumber?: string;
  semester?: number;
  avatarUrl?: string;
  designation?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
}

const UserSchema = new Schema<IUser>(
  {
    userId:     { type: String, required: true, unique: true },
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true, lowercase: true },
    role:       { type: String, enum: ['student', 'faculty', 'hod'], required: true },
    department: { type: String, required: true },
    password:   { type: String, required: true },
    rollNumber: { type: String },
    semester:   { type: Number },
    avatarUrl:  { type: String },
    designation: { type: String },
    phone:      { type: String },
    dob:        { type: String },
    gender:     { type: String },
    address:    { type: String },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
