import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StudentLogin() {
  return (
    <LoginForm
      heading="Welcome to UPSA FYP System"
      identifierLabel="Index Number"
      identifierPlaceholder="Index Number"
      passwordPlaceholder="Date of Birth eg. 20-07-2004"
      identifierAutoComplete="username"
      allowedRoles={['student']}
      wrongRoleMessage="This looks like a staff account. Please use the Staff / Admin sign-in page instead."
    >
      <p className="mt-6 text-sm">
        <Link to="/forgot-password" className="text-brand hover:underline">
          Forgot Password?
        </Link>
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Staff or admin?{' '}
        <Link to="/admin" className="text-brand hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
