import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentCoursePage from './pages/StudentCoursePage';
import ProfessorPage from './pages/ProfessorPage';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import StatsPage from './pages/StatsPage';
import { useAuth } from './lib/auth';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'administrator') return <Navigate to="/admin" replace />;
  if (user.role === 'profesor') return <Navigate to="/professor" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'audit') return <Navigate to="/audit" replace />;
  return <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/reset-password" element={<AuthPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/student"
          element={
            <ProtectedRoute roles={['student', 'administrator']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/course/:courseId"
          element={
            <ProtectedRoute roles={['student', 'administrator']}>
              <StudentCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor"
          element={
            <ProtectedRoute roles={['profesor']}>
              <ProfessorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['administrator']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute roles={['administrator']}>
              <StatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={['audit']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
