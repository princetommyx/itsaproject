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
      wrongRoleMessage="This is a staff account. Assessors sign in at /assessor and administrators at /admin."
    />
  )
}
