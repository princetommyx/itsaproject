import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { Alert, Button, Card, Input } from '../components/ui'

export default function ResetPassword() {
  const navigate = useNavigate()
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
      navigate('/login')
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Could not reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Set New Password</h1>
        <p className="mb-6 text-sm text-slate-500">Enter the token emailed to you along with your new password.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}
          <Input label="Index Number" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required />
          <Input label="Reset Token" value={token} onChange={(e) => setToken(e.target.value)} required />
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
            {submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/login" className="text-upsa-blue hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  )
}
