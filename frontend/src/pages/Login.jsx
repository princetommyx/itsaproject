import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, Input } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
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
      const user = await login(identifier, password)
      if (user.is_first_login) {
        navigate('/change-password')
      } else {
        navigate(`/${user.role}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-upsa-blue text-lg font-bold text-white">
            U
          </div>
          <h1 className="text-lg font-semibold text-slate-800">UPSA Final Year Project Portal</h1>
          <p className="text-sm text-slate-500">Sign in with your Index Number or staff email</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}
          <Input
            label="Index Number or Email"
            placeholder="e.g. UPSA/1234567 or j.ofoeda@upsa.edu.gh"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/forgot-password" className="text-upsa-blue hover:underline">
            Forgot your password?
          </Link>
        </p>
      </Card>
    </div>
  )
}
