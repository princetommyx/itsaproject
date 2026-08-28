import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageLoader from './PageLoader'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.is_first_login) {
    return <Navigate to="/change-password" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return <Outlet />
}
