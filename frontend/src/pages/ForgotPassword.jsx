import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/AuthShell'
import { Alert } from '../components/ui'
import Spinner from '../components/Spinner'
import AuthField from '../components/AuthField'

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
    <AuthShell>
      <h1 className="mb-6 text-3xl leading-tight font-extrabold tracking-tight text-foreground">
        Reset your password
      </h1>

      {message ? (
        <Alert variant="info">{message}</Alert>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <AuthField
            label="Index Number"
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner className="h-4 w-4" light />}
            {submitting ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        <Link to="/reset-password" className="text-brand-ink hover:underline">
          Already have a token?
        </Link>
        <span className="mx-2">·</span>
        <Link to="/login" className="text-brand-ink hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
