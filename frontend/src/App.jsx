import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import StudentLogin from './pages/StudentLogin'
import AdminEntry from './pages/AdminEntry'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentSupport from './pages/student/StudentSupport'
import StudentNotifications from './pages/student/StudentNotifications'
import StudentProfile from './pages/student/StudentProfile'
import AssessorDashboard from './pages/assessor/AssessorDashboard'
import ProjectReview from './pages/assessor/ProjectReview'
import Overview from './pages/admin/sections/Overview'
import AllProjects from './pages/admin/sections/AllProjects'
import AdminProjectReview from './pages/admin/sections/AdminProjectReview'
import Assignments from './pages/admin/sections/Assignments'
import ImportStudents from './pages/admin/sections/ImportStudents'
import StaffManagement from './pages/admin/sections/StaffManagement'
import LoginLogs from './pages/admin/sections/LoginLogs'
import Complaints from './pages/admin/sections/Complaints'

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
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />

            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<Layout />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
                <Route path="/student/support" element={<StudentSupport />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['assessor']} />}>
              <Route element={<Layout />}>
                <Route path="/assessor" element={<AssessorDashboard />} />
                <Route path="/assessor/projects/:id" element={<ProjectReview />} />
              </Route>
            </Route>

            <Route path="/admin" element={<AdminEntry />}>
              <Route element={<Layout />}>
                <Route index element={<Overview />} />
                <Route path="projects" element={<AllProjects />} />
                <Route path="projects/:id" element={<AdminProjectReview />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="import" element={<ImportStudents />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="logs" element={<LoginLogs />} />
                <Route path="complaints" element={<Complaints />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
