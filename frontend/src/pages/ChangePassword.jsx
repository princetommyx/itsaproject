import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthShell from '../components/AuthShell'
import { Alert } from '../components/ui'
import Spinner from '../components/Spinner'
import AuthField from '../components/AuthField'

export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await client.post('/password/change', {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      })
      updateUser({ is_first_login: false })
      toast.success('Password updated.')
      navigate(`/${user.role}`)
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Could not update password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-xl font-bold text-foreground">Set a New Password</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {user?.is_first_login
          ? 'For your security, you must set a new password before continuing.'
          : 'Update your account password.'}
      </p>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}
        <AuthField
          label={user?.role === 'student' ? 'Current Password (Date of Birth, YYYYMMDD)' : 'Current Password'}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
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
          {submitting ? 'Saving...' : 'Save Password'}
        </button>
        <button
          type="button"
          onClick={logout}
          className="w-full text-center text-sm text-muted-foreground hover:underline"
        >
          Log out
        </button>
      </form>
    </AuthShell>
  )
}
