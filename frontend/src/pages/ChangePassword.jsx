import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, Input } from '../components/ui'

export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth()
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
      navigate(`/${user.role}`)
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Could not update password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Set a New Password</h1>
        <p className="mb-6 text-sm text-slate-500">
          {user?.is_first_login
            ? 'For your security, you must set a new password before continuing.'
            : 'Update your account password.'}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}
          <Input
            label={user?.role === 'student' ? 'Current Password (Date of Birth, YYYYMMDD)' : 'Current Password'}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Password'}
          </Button>
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-sm text-slate-500 hover:underline"
          >
            Log out
          </button>
        </form>
      </Card>
    </div>
  )
}
