import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * The entry point for a role's section, and its sign-in page.
 *
 * Each role reaches the system at its own address — /student, /assessor,
 * /admin — following the university's own habit of appending a path to the
 * domain. Signed out, that address shows the right sign-in form; signed in as
 * the right role, it opens the section. There is no page listing the other
 * doors, so the staff form is only reachable by someone who was told where it
 * is.
 *
 * Worth being clear about what that does and does not buy: an unlinked URL is
 * not a security control, and it protects nothing on its own. What actually
 * guards a staff account is the role check the server applies to the
 * credentials, the login throttle, and the forced password change on first
 * sign-in. This only stops the student sign-in page advertising where
 * administrators log in.
 */
export default function RoleGate({ role, login }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return login

  if (user.is_first_login) return <Navigate to="/change-password" replace />

  // Signed in as somebody else: send them to their own section rather than
  // showing a sign-in form they are already past.
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />

  return <Outlet />
}
