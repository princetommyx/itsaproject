import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StaffLogin() {
  return (
    <LoginForm
      heading="Welcome back"
      subtitle="Sign in with your official staff email to continue."
      identifierLabel="Official Email"
      identifierPlaceholder="upsa@mail.edu.gh"
      passwordPlaceholder="Enter your password"
      identifierAutoComplete="username"
      allowedRoles={['admin', 'assessor']}
      wrongRoleMessage="This looks like a student account. Please use the Student sign-in page instead."
    >
      <p className="text-center text-sm font-medium text-muted-foreground">
        Are you a student?{' '}
        <Link to="/login" className="font-semibold text-brand-ink hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
