import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StaffLogin from './StaffLogin'

// /admin doubles as the staff sign-in entry point (per the university's own
// convention of appending /admin to the domain) and, once authenticated as
// an admin, the gate into the routed admin dashboard section pages.
export default function AdminEntry() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <StaffLogin />
  if (user.is_first_login) return <Navigate to="/change-password" replace />
  if (user.role !== 'admin') return <Navigate to={`/${user.role}`} replace />

  return <Outlet />
}
