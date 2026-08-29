import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthShell from './AuthShell'
import { Alert } from './ui'
import DotSpinner from './DotSpinner'
import AuthField from './AuthField'

export default function LoginForm({
  heading,
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
        navigate(`/${user.role}`)
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
    <AuthShell>
      <h1 className="mb-7 text-[26px] leading-snug font-extrabold tracking-tight text-slate-900 sm:text-3xl">{heading}</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
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
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-upsa-blue py-3.5 text-base font-bold text-white transition hover:bg-upsa-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Login'}
        </button>

        {submitting && (
          <div className="flex flex-col items-center gap-2 pt-2" aria-live="polite">
            <DotSpinner size={44} />
            <p className="text-sm font-medium text-slate-500">Logging you in...</p>
          </div>
        )}
      </form>

      {children}
    </AuthShell>
  )
}
