import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/AuthShell'
import { Alert } from '../components/ui'
import Spinner from '../components/Spinner'

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
      <h1 className="mb-6 text-xl font-bold text-slate-800">Reset Student Password</h1>

      {message ? (
        <Alert variant="info">{message}</Alert>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-left">
            <span className="mb-1 block text-sm text-slate-500">Index Number</span>
            <input
              className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-slate-800 focus:border-upsa-blue focus:outline-none"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-upsa-blue py-3 font-semibold text-white transition hover:bg-upsa-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner className="h-4 w-4" light />}
            {submitting ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs text-slate-400">
        <Link to="/reset-password" className="text-upsa-blue hover:underline">
          Already have a token?
        </Link>
        <span className="mx-2">·</span>
        <Link to="/login" className="text-upsa-blue hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
