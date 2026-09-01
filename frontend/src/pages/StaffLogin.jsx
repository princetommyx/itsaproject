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
      wrongRoleMessage="This is a student account. Students sign in at /student."
    />
  )
}
