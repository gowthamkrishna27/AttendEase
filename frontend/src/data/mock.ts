import type { AttendanceRequest, Faculty, Student } from '../types';

export const mockStudent: Student = {
  id: 'stu-001',
  name: 'Arjun Sharma',
  rollNumber: '24B91A0720',
  department: 'Computer Science',
  semester: 6,
  email: 'arjun.sharma@college.edu',
  avatarUrl: 'https://srkrexams.in/SRKR/photo/24B91A0720.jpg',
};

export const mockFaculty: Faculty[] = [
  {
    id: 'fac-001',
    name: 'Dr. Priya Nair',
    department: 'Computer Science',
    email: 'priya.nair@college.edu',
  },
  {
    id: 'fac-002',
    name: 'Prof. Ramesh Kumar',
    department: 'Electronics',
    email: 'ramesh.kumar@college.edu',
  },
  {
    id: 'fac-003',
    name: 'Dr. Anita Desai',
    department: 'Mechanical',
    email: 'anita.desai@college.edu',
  },
];

export const mockStudents: Student[] = [
  {
    id: 'stu-001',
    name: 'Arjun Sharma',
    rollNumber: '24B91A0720',
    department: 'Computer Science',
    semester: 6,
    email: 'arjun.sharma@college.edu',
    avatarUrl: 'https://srkrexams.in/SRKR/photo/24B91A0720.jpg',
  },
  {
    id: 'stu-002',
    name: 'Meera Iyer',
    rollNumber: '21CS052',
    department: 'Computer Science',
    semester: 6,
    email: 'meera.iyer@college.edu',
  },
  {
    id: 'stu-003',
    name: 'Karan Mehta',
    rollNumber: '21EC021',
    department: 'Electronics',
    semester: 5,
    email: 'karan.mehta@college.edu',
  },
  {
    id: 'stu-004',
    name: 'Divya Patel',
    rollNumber: '21ME033',
    department: 'Mechanical',
    semester: 4,
    email: 'divya.patel@college.edu',
  },
  {
    id: 'stu-005',
    name: 'Rohit Verma',
    rollNumber: '21CS019',
    department: 'Computer Science',
    semester: 6,
    email: 'rohit.verma@college.edu',
  },
];

export const mockRequests: AttendanceRequest[] = [];

export const studentRequests = mockRequests.filter(r => r.studentId === 'stu-001');
export const pendingFacultyRequests = mockRequests.filter(r => r.status === 'pending');
