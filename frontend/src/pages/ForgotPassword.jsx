import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { Alert, Button, Card, Input } from '../components/ui'

export default function ForgotPassword() {
  const [universityId, setUniversityId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await client.post('/password/forgot', { university_id: universityId })
      setMessage(res.data.message)
    } catch {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Reset Your Password</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter your Index Number. A reset token will be emailed to your registered address.
        </p>

        {message ? (
          <Alert variant="info">{message}</Alert>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Index Number"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Reset Token'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/reset-password" className="text-upsa-blue hover:underline">
            Already have a token?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link to="/login" className="text-upsa-blue hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  )
}
