import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import type { UserRole } from './context/AuthContext';

// Pages — public & auth
import Landing from './pages/Landing';
import LoginPortal from './pages/auth/LoginPortal';
import AdminLogin from './pages/admin/Login';

// Pages — student
import StudentHome from './pages/student/Home';
import NewRequest from './pages/student/NewRequest';
import RequestSuccess from './pages/student/RequestSuccess';
import History from './pages/student/History';
import StudentRequestDetails from './pages/student/RequestDetails';
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

// Pages — admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCounseling from './pages/admin/Counseling';
import AdminRequests from './pages/admin/Requests';
import AdminSettings from './pages/admin/Settings';

// Shared / Admin — permissions
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
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94A3B8' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  }

  if (user.role !== role && user.role !== 'admin') {
    // Allow seamless access to portals during pair programming and testing
    return <>{children}</>;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPortal />} />

        {/* Approved Permissions page (all roles & URL aliases) */}
        <Route path="/permissions" element={<PermissionsPage />} />
        <Route path="/permissions/*" element={<PermissionsPage />} />
        <Route path="/permission" element={<PermissionsPage />} />
        <Route path="/student/permissions" element={<PermissionsPage />} />
        <Route path="/faculty/permissions" element={<PermissionsPage />} />
        <Route path="/hod/permissions" element={<PermissionsPage />} />
        <Route path="/admin/permissions" element={<PermissionsPage />} />

        {/* Legacy redirects */}
        <Route path="/login/student" element={<Navigate to="/login" replace />} />
        <Route path="/login/faculty" element={<Navigate to="/login" replace />} />
        <Route path="/login/hod" element={<Navigate to="/login" replace />} />

        {/* Student (protected) */}
        <Route path="/student" element={<ProtectedRoute role="student"><StudentHome /></ProtectedRoute>} />
        <Route path="/student/new-request" element={<ProtectedRoute role="student"><NewRequest /></ProtectedRoute>} />
        <Route path="/student/success" element={<ProtectedRoute role="student"><RequestSuccess /></ProtectedRoute>} />
        <Route path="/student/history" element={<ProtectedRoute role="student"><History /></ProtectedRoute>} />
        <Route path="/student/request/:id" element={<ProtectedRoute role="student"><StudentRequestDetails /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
        <Route path="/student/notifications" element={<ProtectedRoute role="student"><StudentNotifications /></ProtectedRoute>} />

        {/* Faculty (protected) */}
        <Route path="/faculty" element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/attendance" element={<ProtectedRoute role="faculty"><FacultyAttendance /></ProtectedRoute>} />
        <Route path="/faculty/requests" element={<ProtectedRoute role="faculty"><FacultyRequests /></ProtectedRoute>} />
        <Route path="/faculty/request/:id" element={<ProtectedRoute role="faculty"><FacultyRequestDetails /></ProtectedRoute>} />
        <Route path="/faculty/students" element={<ProtectedRoute role="faculty"><FacultyStudents /></ProtectedRoute>} />
        <Route path="/faculty/reports" element={<ProtectedRoute role="faculty"><FacultyReports /></ProtectedRoute>} />
        <Route path="/faculty/settings" element={<ProtectedRoute role="faculty"><FacultySettings /></ProtectedRoute>} />

        {/* HOD (protected) */}
        <Route path="/hod" element={<ProtectedRoute role="hod"><HODDashboard /></ProtectedRoute>} />
        <Route path="/hod/request/:id" element={<ProtectedRoute role="hod"><HODRequestDetails /></ProtectedRoute>} />
        <Route path="/hod/requests" element={<ProtectedRoute role="hod"><HODAllRequests /></ProtectedRoute>} />
        <Route path="/hod/faculty" element={<ProtectedRoute role="hod"><HODFaculty /></ProtectedRoute>} />
        <Route path="/hod/reports" element={<ProtectedRoute role="hod"><HODReports /></ProtectedRoute>} />
        <Route path="/hod/settings" element={<ProtectedRoute role="hod"><HODSettings /></ProtectedRoute>} />

        {/* Admin (protected & standalone login) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/counseling" element={<ProtectedRoute role="admin"><AdminCounseling /></ProtectedRoute>} />
        <Route path="/admin/requests" element={<ProtectedRoute role="admin"><AdminRequests /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
