import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
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
    <AuthShell>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Set a New Password</h1>
      <p className="mb-6 text-sm text-slate-500">
        {user?.is_first_login
          ? 'For your security, you must set a new password before continuing.'
          : 'Update your account password.'}
      </p>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}
        <Field
          label={user?.role === 'student' ? 'Current Password (Date of Birth, YYYYMMDD)' : 'Current Password'}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
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
          {submitting ? 'Saving...' : 'Save Password'}
        </button>
        <button
          type="button"
          onClick={logout}
          className="w-full text-center text-sm text-slate-400 hover:underline"
        >
          Log out
        </button>
      </form>
    </AuthShell>
  )
}
