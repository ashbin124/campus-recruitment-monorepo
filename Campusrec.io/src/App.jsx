import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Auth from './pages/Auth.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import CompanyLayout from './layouts/CompanyLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import StudentDashboard from './pages/student/Dashboard.jsx';
import Jobs from './pages/student/Jobs.jsx';
import Profile from './pages/student/Profile.jsx';
import StudentApplications from './pages/student/Applications.jsx';
import CompanyDashboard from './pages/company/Dashboard.jsx';
import Applications from './pages/company/Applications.jsx';
import AdminOverview from './pages/admin/Overview.jsx';
import CompanyProfile from './pages/company/Profile.jsx';
import AdminProfile from './pages/admin/Profile.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import CompanyProfilePublic from './pages/public/CompanyProfilePublic.jsx';
import { useAuth } from './context/AuthContext.jsx';
import NotFound from './pages/NotFound.jsx';

function roleHome(role) {
  if (role === 'COMPANY') return '/company';
  if (role === 'ADMIN') return '/admin';
  return '/student';
}

function ProtectedRoute({ roles, children }) {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <div className="p-6">Loading...</div>;
  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}

function AuthRoute({ children }) {
  const { token, user } = useAuth();
  if (token && !user) return <div className="p-6">Loading...</div>;
  if (token && user) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Auth mode="login" />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <Auth mode="register" />
          </AuthRoute>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/companies/:id" element={<CompanyProfilePublic />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentLayout>
              <StudentDashboard />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/jobs"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentLayout>
              <Jobs />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentLayout>
              <Profile />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/applications"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentLayout>
              <StudentApplications />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company"
        element={
          <ProtectedRoute roles={['COMPANY']}>
            <CompanyLayout>
              <CompanyDashboard />
            </CompanyLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/applications"
        element={
          <ProtectedRoute roles={['COMPANY']}>
            <CompanyLayout>
              <Applications />
            </CompanyLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/profile"
        element={
          <ProtectedRoute roles={['COMPANY']}>
            <CompanyLayout>
              <CompanyProfile />
            </CompanyLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminLayout>
              <AdminOverview />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminLayout>
              <AdminProfile />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
