import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginChoice from './pages/LoginChoice'
import StudentLogin from './pages/StudentLogin'
import StaffLogin from './pages/StaffLogin'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import StudentDashboard from './pages/student/StudentDashboard'
import AssessorDashboard from './pages/assessor/AssessorDashboard'
import ProjectReview from './pages/assessor/ProjectReview'
import AdminDashboard from './pages/admin/AdminDashboard'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.is_first_login) return <Navigate to="/change-password" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginChoice />} />
          <Route path="/login/student" element={<StudentLogin />} />
          <Route path="/login/staff" element={<StaffLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<Layout />}>
              <Route path="/student" element={<StudentDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['assessor']} />}>
            <Route element={<Layout />}>
              <Route path="/assessor" element={<AssessorDashboard />} />
              <Route path="/assessor/projects/:id" element={<ProjectReview />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
