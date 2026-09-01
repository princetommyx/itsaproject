import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useToast } from '../context/ToastContext'
import AuthShell from '../components/AuthShell'
import { Alert } from '../components/ui'
import Spinner from '../components/Spinner'
import AuthField from '../components/AuthField'

export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [universityId, setUniversityId] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await client.post('/password/reset', {
        university_id: universityId,
        token,
        password,
        password_confirmation: confirmation,
      })
      toast.success('Password reset. Please sign in.')
      navigate('/student')
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Could not reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-6 text-3xl leading-tight font-extrabold tracking-tight text-foreground">
        Set a new password
      </h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}
        <AuthField label="Index Number" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required />
        <AuthField label="Reset Token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <AuthField
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <AuthField
          label="Confirm New Password"
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          minLength={8}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Spinner className="h-4 w-4" light />}
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        <Link to="/student" className="text-brand-ink hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
