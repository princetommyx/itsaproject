import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useToast } from '../context/ToastContext'
import AuthShell from '../components/AuthShell'
import { Alert } from '../components/ui'

function Field({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm text-slate-500">{label}</span>
      <input
        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-slate-800 focus:border-upsa-blue focus:outline-none"
        {...props}
      />
    </label>
  )
}

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
      navigate('/login')
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Could not reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-6 text-xl font-bold text-slate-800">Set New Password</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}
        <Field label="Index Number" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required />
        <Field label="Reset Token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <Field
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Field
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
          className="w-full rounded-lg bg-upsa-blue py-3 font-semibold text-white transition hover:bg-upsa-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-6 text-xs text-slate-400">
        <Link to="/login" className="text-upsa-blue hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
