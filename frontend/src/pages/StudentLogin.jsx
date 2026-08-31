import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

/**
 * The student gateway.
 *
 * The password hint has to match what the server actually compares against.
 * The CSV import sets a new student's first password to their date of birth
 * formatted YYYYMMDD, so "20-07-2004" — which this used to suggest — fails.
 * Anyone typing exactly what the page showed them got "Invalid credentials"
 * on an account that was working perfectly.
 */
export default function StudentLogin() {
  return (
    <LoginForm
      heading="Welcome back"
      subtitle="Sign in with your index number to reach your project."
      identifierLabel="Index Number"
      identifierPlaceholder="e.g. UPSA/1000010"
      passwordPlaceholder="Date of birth as YYYYMMDD, e.g. 20040720"
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
