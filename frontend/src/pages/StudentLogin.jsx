import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StudentLogin() {
  return (
    <LoginForm
      heading="Welcome to UPSA Student Portal"
      identifierLabel="Index Number"
      identifierPlaceholder=""
      identifierAutoComplete="username"
      allowedRoles={['student']}
      wrongRoleMessage="This looks like a staff account. Please use the Staff / Admin sign-in page instead."
    >
      <p className="mt-6 text-sm">
        <Link to="/forgot-password" className="text-upsa-blue hover:underline">
          Forgot Password?
        </Link>
      </p>
      <p className="mt-3 text-xs text-slate-400">
        Staff or admin?{' '}
        <Link to="/admin" className="text-upsa-blue hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
