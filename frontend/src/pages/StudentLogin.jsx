import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StudentLogin() {
  return (
    <LoginForm
      heading="Welcome back"
      subtitle="Sign in with your index number to reach your project."
      identifierLabel="Index Number"
      identifierPlaceholder="Index Number"
      passwordPlaceholder="Date of Birth eg. 20-07-2004"
      identifierAutoComplete="username"
      allowedRoles={['student']}
      wrongRoleMessage="This looks like a staff account. Please use the Staff / Admin sign-in page instead."
    >
      <p className="text-center text-sm font-medium text-muted-foreground">
        Staff or administrator?{' '}
        <Link to="/admin" className="font-semibold text-brand-ink hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
