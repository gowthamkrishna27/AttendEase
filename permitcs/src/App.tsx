import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import type { UserRole } from './context/AuthContext';

// Pages — public
import Landing from './pages/Landing';
import LoginPortal from './pages/auth/LoginPortal';

// Pages — student
import StudentHome from './pages/student/Home';
import NewRequest from './pages/student/NewRequest';
import RequestSuccess from './pages/student/RequestSuccess';
import History from './pages/student/History';
import StudentRequestDetails from './pages/student/RequestDetails';
import Profile from './pages/student/Profile';

// Pages — faculty
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyRequestDetails from './pages/faculty/RequestDetails';

// Pages — HOD
import HODDashboard from './pages/hod/Dashboard';
import HODRequestDetails from './pages/hod/RequestDetails';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
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
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPortal />} />

        {/* Legacy redirects — keep old URLs working */}
        <Route path="/login/student" element={<Navigate to="/login" replace />} />
        <Route path="/login/faculty" element={<Navigate to="/login" replace />} />
        <Route path="/login/hod"     element={<Navigate to="/login" replace />} />

        {/* Student (protected) */}
        <Route path="/student"                element={<ProtectedRoute role="student"><StudentHome /></ProtectedRoute>} />
        <Route path="/student/new-request"    element={<ProtectedRoute role="student"><NewRequest /></ProtectedRoute>} />
        <Route path="/student/success"        element={<ProtectedRoute role="student"><RequestSuccess /></ProtectedRoute>} />
        <Route path="/student/history"        element={<ProtectedRoute role="student"><History /></ProtectedRoute>} />
        <Route path="/student/request/:id"    element={<ProtectedRoute role="student"><StudentRequestDetails /></ProtectedRoute>} />
        <Route path="/student/profile"        element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />

        {/* Faculty (protected) */}
        <Route path="/faculty"             element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/request/:id" element={<ProtectedRoute role="faculty"><FacultyRequestDetails /></ProtectedRoute>} />

        {/* HOD (protected) */}
        <Route path="/hod"             element={<ProtectedRoute role="hod"><HODDashboard /></ProtectedRoute>} />
        <Route path="/hod/request/:id" element={<ProtectedRoute role="hod"><HODRequestDetails /></ProtectedRoute>} />

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
