import React from 'react';
import { useLocation } from 'react-router-dom';
import { MeniscusNavigation } from '../navigation/MeniscusNavigation';
import {
  Home,
  Bell,
  Plus,
  Clock,
  User,
  CheckSquare,
  ClipboardList,
  Users,
  Award,
  CalendarCheck,
  UserCheck,
  Database,
  Settings,
} from 'lucide-react';

const studentNav = [
  { id: 'home', to: '/student', label: 'Home', icon: Home },
  { id: 'notifications', to: '/student/notifications', label: 'Notifications', icon: Bell, hasBadge: true },
  { id: 'new-request', to: '/student/new-request', label: 'New Request', icon: Plus },
  { id: 'history', to: '/student/history', label: 'History', icon: Clock },
  { id: 'profile', to: '/student/profile', label: 'Profile', icon: User },
];

const facultyNav = [
  { id: 'home', to: '/faculty', label: 'Dashboard', icon: Home },
  { id: 'attendance', to: '/faculty/attendance', label: 'Attendance', icon: CheckSquare },
  { id: 'requests', to: '/faculty/requests', label: 'Requests', icon: ClipboardList },
  { id: 'students', to: '/faculty/students', label: 'Students', icon: Users },
  { id: 'activities', to: '/faculty/student-activities', label: 'Activities', icon: Award },
];

const hodNav = [
  { id: 'home', to: '/hod', label: 'Overview', icon: Home },
  { id: 'faculty', to: '/hod/faculty', label: 'Faculty', icon: Users },
  { id: 'requests', to: '/hod/requests', label: 'Requests', icon: ClipboardList },
  { id: 'activities', to: '/hod/student-activities', label: 'Activities', icon: Award },
];

const adminNav = [
  { id: 'home', to: '/admin', label: 'Dashboard', icon: Home },
  { id: 'users', to: '/admin/users', label: 'Accounts', icon: Users },
  { id: 'invigilation', to: '/admin/invigilation', label: 'Invigilation', icon: CalendarCheck },
  { id: 'counseling', to: '/admin/counseling', label: 'Counseling', icon: UserCheck },
  { id: 'database', to: '/admin/database', label: 'Database', icon: Database },
  { id: 'settings', to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Navbar({ role = 'student' }: { role?: 'student' | 'faculty' | 'hod' | 'admin' }) {
  const location = useLocation();
  const items =
    role === 'admin'
      ? adminNav
      : role === 'hod'
      ? hodNav
      : role === 'faculty'
      ? facultyNav
      : studentNav;

  return <MeniscusNavigation items={items} activePath={location.pathname} role={role} />;
}

export default Navbar;
