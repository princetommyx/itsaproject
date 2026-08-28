import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthShell from './AuthShell'
import { Alert } from './ui'
import Spinner from './Spinner'

function UnderlineInput({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm text-slate-500">{label}</span>
      <input
        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-slate-800 placeholder:text-slate-400 focus:border-upsa-blue focus:outline-none"
        {...props}
      />
    </label>
  )
}

export default function LoginForm({
  heading,
  identifierLabel,
  identifierPlaceholder,
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
      <h1 className="mb-6 text-2xl leading-snug font-bold text-slate-800">{heading}</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}
        <UnderlineInput
          label={identifierLabel}
          placeholder={identifierPlaceholder}
          autoComplete={identifierAutoComplete}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoFocus
        />
        <UnderlineInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-upsa-blue py-3 font-semibold text-white transition hover:bg-upsa-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Spinner className="h-4 w-4" light />}
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>

      {children}
    </AuthShell>
  )
}
