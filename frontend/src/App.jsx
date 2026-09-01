
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SWRConfig } from 'swr'
import client from './api/client'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import { PageMetaProvider } from './context/PageMetaContext'
import Layout from './components/Layout'
import PageLoader from './components/PageLoader'

import StudentLogin from './pages/StudentLogin'
import RoleGate from './components/RoleGate'
import StaffLogin from './pages/StaffLogin'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentSupport from './pages/student/StudentSupport'
import StudentNotifications from './pages/student/StudentNotifications'
import StudentProfile from './pages/student/StudentProfile'
import StudentDocuments from './pages/student/StudentDocuments'
import AssessorDashboard from './pages/assessor/AssessorDashboard'
import ProjectReview from './pages/assessor/ProjectReview'
import AssessorProfile from './pages/assessor/AssessorProfile'
import AssessorNotifications from './pages/assessor/AssessorNotifications'
import Overview from './pages/admin/sections/Overview'
import AllProjects from './pages/admin/sections/AllProjects'
import AdminProjectReview from './pages/admin/sections/AdminProjectReview'
import DefenseSchedules from './pages/admin/sections/DefenseSchedules'
import Assignments from './pages/admin/sections/Assignments'
import ImportStudents from './pages/admin/sections/ImportStudents'
import Students from './pages/admin/sections/Students'
import AdminStudentDetail from './pages/admin/sections/AdminStudentDetail'
import CompareVersions from './pages/CompareVersions'
import AdminSettings from './pages/admin/settings/AdminSettings'
import StaffManagement from './pages/admin/sections/StaffManagement'
import LoginLogs from './pages/admin/sections/LoginLogs'
import Complaints from './pages/admin/sections/Complaints'
import AdminProfile from './pages/admin/sections/AdminProfile'
import AdminNotifications from './pages/admin/sections/AdminNotifications'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/student" replace />
  if (user.is_first_login) return <Navigate to="/change-password" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <SWRConfig 
        value={{
          fetcher: (url) => client.get(url).then(res => res.data),
          revalidateOnFocus: false, // Optional: customize defaults here
        }}
      >
        <ToastProvider>
          <AuthProvider>
          <SettingsProvider>
          <PageMetaProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              {/* The student gateway moved to /student; /login stays as a
                  redirect so old links and bookmarks still land. */}
              <Route path="/login" element={<Navigate to="/student" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />

              <Route path="/student" element={<RoleGate role="student" login={<StudentLogin />} />}>
                <Route element={<Layout />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="notifications" element={<StudentNotifications />} />
                  <Route path="documents" element={<StudentDocuments />} />
                  <Route path="support" element={<StudentSupport />} />
                  <Route path="profile" element={<StudentProfile />} />
                </Route>
              </Route>

              {/* Assessors get their own door too. Without one they landed on the
                  student form, which correctly refuses a staff account — and
                  with the cross-link gone they would have had no way through. */}
              <Route path="/assessor" element={<RoleGate role="assessor" login={<StaffLogin />} />}>
                <Route element={<Layout />}>
                  <Route index element={<AssessorDashboard />} />
                  <Route path="projects/:id" element={<ProjectReview />} />
                  <Route path="projects/:id/compare" element={<CompareVersions apiPrefix="/assessor" backTo="/assessor/projects" />} />
                  <Route path="notifications" element={<AssessorNotifications />} />
                  <Route path="profile" element={<AssessorProfile />} />
                </Route>
              </Route>

              <Route path="/admin" element={<RoleGate role="admin" login={<StaffLogin />} />}>
                <Route element={<Layout />}>
                  <Route index element={<Overview />} />
                  <Route path="projects" element={<AllProjects />} />
                  <Route path="projects/:id" element={<AdminProjectReview />} />
                  <Route path="projects/:id/compare" element={<CompareVersions apiPrefix="/admin" backTo="/admin/projects" />} />
                  <Route path="schedules" element={<DefenseSchedules />} />
                  <Route path="assignments" element={<Assignments />} />
                  <Route path="students" element={<Students />} />
                  <Route path="students/:id" element={<AdminStudentDetail />} />
                  <Route path="import" element={<ImportStudents />} />
                  <Route path="staff" element={<StaffManagement />} />
                  {/* Import folded into the Staff Accounts page; keep the old
                      URL pointing somewhere sensible. */}
                  <Route path="staff/import" element={<Navigate to="/admin/staff" replace />} />
                  <Route path="logs" element={<LoginLogs />} />
                  <Route path="complaints" element={<Complaints />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="profile" element={<AdminProfile />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageMetaProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
      </SWRConfig>
    </BrowserRouter>
    </ThemeProvider>
  )
}
