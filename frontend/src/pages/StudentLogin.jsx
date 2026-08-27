import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StudentLogin() {
  return (
    <LoginForm
      subtitle="Student sign in"
      identifierLabel="Index Number"
      identifierPlaceholder="e.g. UPSA/1234567"
      identifierAutoComplete="username"
      allowedRoles={['student']}
      wrongRoleMessage="This looks like a staff account. Please use the Staff / Admin sign-in page instead."
    >
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/forgot-password" className="text-upsa-blue hover:underline">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        Staff or admin?{' '}
        <Link to="/login/staff" className="text-upsa-blue hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
