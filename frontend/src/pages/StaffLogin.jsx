import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function StaffLogin() {
  return (
    <LoginForm
      heading="Welcome to UPSA FYP System"
      identifierLabel="Official Email"
      identifierPlaceholder="e.g. j.ofoeda@upsa.edu.gh"
      identifierAutoComplete="username"
      allowedRoles={['admin', 'assessor']}
      wrongRoleMessage="This looks like a student account. Please use the Student sign-in page instead."
    >
      <p className="mt-6 text-xs text-slate-400">
        Student?{' '}
        <Link to="/login" className="text-upsa-blue hover:underline">
          Sign in here
        </Link>
      </p>
    </LoginForm>
  )
}
