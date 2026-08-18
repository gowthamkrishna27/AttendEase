import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import type { UserRole } from './context/AuthContext';

// Pages — public & auth
import SplashSequence from './components/SplashSequence';
import LoginPortal from './pages/auth/LoginPortal';
import ShareRedirectPage from './pages/ShareRedirectPage';

// Pages — student
import StudentHome from './pages/student/Home';
import NewRequest from './pages/student/NewRequest';
import RequestSuccess from './pages/student/RequestSuccess';
import History from './pages/student/History';
import StudentRequestDetails from './pages/student/RequestDetails';
import EditRequest from './pages/student/EditRequest';
import Profile from './pages/student/Profile';
import StudentNotifications from './pages/student/Notifications';

// Pages — faculty
import FacultyDashboard from './pages/faculty_portal/Dashboard';
import FacultyRequests from './pages/faculty_portal/Requests';
import FacultyRequestDetails from './pages/faculty_portal/RequestDetails';
import FacultyStudents from './pages/faculty_portal/Students';
import FacultyReports from './pages/faculty_portal/Reports';
import FacultySettings from './pages/faculty_portal/Settings';
import FacultyAttendance from './pages/faculty_portal/Attendance';

// Pages — HOD
import HODDashboard from './pages/hod/Dashboard';
import HODRequestDetails from './pages/hod/RequestDetails';
import HODAllRequests from './pages/hod/AllRequests';
import HODFaculty from './pages/hod/Faculty';
import HODReports from './pages/hod/Reports';
import HODSettings from './pages/hod/Settings';

// Shared — permissions
import PermissionsPage from './pages/Permissions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 1 },
  },
});

// Protected route wrapper
function ProtectedRoute({
  children,
  role,
  allowPasswordChange = false,
}: {
  children: React.ReactNode;
  role: UserRole;
  allowPasswordChange?: boolean;
}) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if ((user as any)?.mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (user?.role !== role) {
    const roleHomeMap: Record<UserRole, string> = {
      student: '/student',
      faculty: '/faculty',
      hod: '/hod',
      admin: '/login',
    };
    return <Navigate to={roleHomeMap[user?.role as UserRole] ?? '/login'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* App Startup: White -> Animation -> Login */}
        <Route path="/" element={<SplashSequence />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPortal />} />
        <Route path="/share/:publicId" element={<ShareRedirectPage />} />

        {/* Approved Permissions page (all roles & URL aliases) */}
        <Route path="/permissions" element={<PermissionsPage />} />
        <Route path="/permissions/*" element={<PermissionsPage />} />
        <Route path="/permission" element={<PermissionsPage />} />
        <Route path="/student/permissions" element={<PermissionsPage />} />
        <Route path="/faculty/permissions" element={<PermissionsPage />} />
        <Route path="/hod/permissions" element={<PermissionsPage />} />

        {/* Legacy redirects */}
        <Route path="/login/student" element={<Navigate to="/login" replace />} />
        <Route path="/login/faculty" element={<Navigate to="/login" replace />} />
        <Route path="/login/hod" element={<Navigate to="/login" replace />} />

        {/* Student (protected) */}
        <Route path="/student" element={<ProtectedRoute role="student"><StudentHome /></ProtectedRoute>} />
        <Route path="/student/new-request" element={<ProtectedRoute role="student"><NewRequest /></ProtectedRoute>} />
        <Route path="/student/success" element={<ProtectedRoute role="student"><RequestSuccess /></ProtectedRoute>} />
        <Route path="/student/history" element={<ProtectedRoute role="student"><History /></ProtectedRoute>} />
        <Route path="/student/request/:id/edit" element={<ProtectedRoute role="student"><EditRequest /></ProtectedRoute>} />
        <Route path="/student/request/:id" element={<ProtectedRoute role="student"><StudentRequestDetails /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
        <Route path="/student/notifications" element={<ProtectedRoute role="student"><StudentNotifications /></ProtectedRoute>} />

        {/* Faculty (protected) */}
        <Route path="/faculty" element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/attendance" element={<ProtectedRoute role="faculty"><FacultyAttendance /></ProtectedRoute>} />
        <Route path="/faculty/requests" element={<ProtectedRoute role="faculty"><FacultyRequests /></ProtectedRoute>} />
        <Route path="/faculty/request/:id" element={<ProtectedRoute role="faculty"><FacultyRequestDetails /></ProtectedRoute>} />
        <Route path="/faculty/review/:id" element={<ProtectedRoute role="faculty"><FacultyRequestDetails /></ProtectedRoute>} />
        <Route path="/faculty/students" element={<ProtectedRoute role="faculty"><FacultyStudents /></ProtectedRoute>} />
        <Route path="/faculty/reports" element={<ProtectedRoute role="faculty"><FacultyReports /></ProtectedRoute>} />
        <Route path="/faculty/settings" element={<ProtectedRoute role="faculty"><FacultySettings /></ProtectedRoute>} />

        {/* HOD (protected) */}
        <Route path="/hod" element={<ProtectedRoute role="hod"><HODDashboard /></ProtectedRoute>} />
        <Route path="/hod/request/:id" element={<ProtectedRoute role="hod"><HODRequestDetails /></ProtectedRoute>} />
        <Route path="/hod/review/:id" element={<ProtectedRoute role="hod"><HODRequestDetails /></ProtectedRoute>} />
        <Route path="/hod/requests" element={<ProtectedRoute role="hod"><HODAllRequests /></ProtectedRoute>} />
        <Route path="/hod/faculty" element={<ProtectedRoute role="hod"><HODFaculty /></ProtectedRoute>} />
        <Route path="/hod/reports" element={<ProtectedRoute role="hod"><HODReports /></ProtectedRoute>} />
        <Route path="/hod/settings" element={<ProtectedRoute role="hod"><HODSettings /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
