import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SWRConfig } from 'swr'
import client from './api/client'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import PageLoader from './components/PageLoader'

const StudentLogin = lazy(() => import('./pages/StudentLogin'))
const AdminEntry = lazy(() => import('./pages/AdminEntry'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const StudentSupport = lazy(() => import('./pages/student/StudentSupport'))
const StudentNotifications = lazy(() => import('./pages/student/StudentNotifications'))
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'))
const StudentDocuments = lazy(() => import('./pages/student/StudentDocuments'))
const AssessorDashboard = lazy(() => import('./pages/assessor/AssessorDashboard'))
const ProjectReview = lazy(() => import('./pages/assessor/ProjectReview'))
const AssessorProfile = lazy(() => import('./pages/assessor/AssessorProfile'))
const AssessorNotifications = lazy(() => import('./pages/assessor/AssessorNotifications'))
const Overview = lazy(() => import('./pages/admin/sections/Overview'))
const AllProjects = lazy(() => import('./pages/admin/sections/AllProjects'))
const AdminProjectReview = lazy(() => import('./pages/admin/sections/AdminProjectReview'))
const Assignments = lazy(() => import('./pages/admin/sections/Assignments'))
const ImportStudents = lazy(() => import('./pages/admin/sections/ImportStudents'))
const StaffManagement = lazy(() => import('./pages/admin/sections/StaffManagement'))
const LoginLogs = lazy(() => import('./pages/admin/sections/LoginLogs'))
const Complaints = lazy(() => import('./pages/admin/sections/Complaints'))
const AdminProfile = lazy(() => import('./pages/admin/sections/AdminProfile'))
const AdminNotifications = lazy(() => import('./pages/admin/sections/AdminNotifications'))

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
      <SWRConfig 
        value={{
          fetcher: (url) => client.get(url).then(res => res.data),
          revalidateOnFocus: false, // Optional: customize defaults here
        }}
      >
        <ToastProvider>
          <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
                  <Route path="/student/documents" element={<StudentDocuments />} />
                  <Route path="/student/support" element={<StudentSupport />} />
                  <Route path="/student/profile" element={<StudentProfile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['assessor']} />}>
                <Route element={<Layout />}>
                  <Route path="/assessor" element={<AssessorDashboard />} />
                  <Route path="/assessor/projects/:id" element={<ProjectReview />} />
                  <Route path="/assessor/notifications" element={<AssessorNotifications />} />
                  <Route path="/assessor/profile" element={<AssessorProfile />} />
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
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="profile" element={<AdminProfile />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
      </SWRConfig>
    </BrowserRouter>
  )
}
