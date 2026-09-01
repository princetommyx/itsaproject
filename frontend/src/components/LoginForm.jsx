import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthShell from './AuthShell'
import { Alert } from './ui'
import DotSpinner from './DotSpinner'
import AuthField from './AuthField'

export default function LoginForm({
  heading,
  subtitle,
  identifierLabel,
  identifierPlaceholder,
  passwordPlaceholder,
  identifierAutoComplete,
  allowedRoles,
  wrongRoleMessage,
  children,
}) {
  const { login, commitSession, discardSession } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { token, user } = await login(identifier, password)

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        await discardSession(token)
        setError(wrongRoleMessage)
        return
      }

      commitSession(token, user)

      if (user.is_first_login) {
        navigate('/change-password')
      } else {
        toast.success(`Welcome back, ${user.name.split(' ')[0]}.`)

        // Each role's sign-in form lives at that role's own address, so
        // arriving at /student/documents signed out shows this form with the
        // URL intact. Stay put in that case and let the gate render what was
        // asked for — sending everyone to the section root instead means a
        // link from a notification always lands one navigation short.
        const inOwnSection = location.pathname.startsWith(`/${user.role}`)
        if (!inOwnSection) navigate(`/${user.role}`)
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || 'Invalid credentials. Please try again.')
      } else {
        setError('Could not reach the server. It may be offline, misconfigured, or blocked by your network — this is not a wrong-password error.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell footer={children}>
      <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-foreground">
        {heading}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[15px] font-medium text-muted-foreground">{subtitle}</p>
      )}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}

        <AuthField
          label={identifierLabel}
          placeholder={identifierPlaceholder}
          autoComplete={identifierAutoComplete}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoFocus
        />

        <AuthField
          label="Password"
          type="password"
          placeholder={passwordPlaceholder}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          action={
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-ink hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[15px] font-bold text-brand-foreground transition hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>

        {submitting && (
          <div className="flex flex-col items-center gap-2 pt-1" aria-live="polite">
            <DotSpinner size={40} />
            <p className="text-sm font-medium text-muted-foreground">Logging you in…</p>
          </div>
        )}
      </form>
    </AuthShell>
  )
}
