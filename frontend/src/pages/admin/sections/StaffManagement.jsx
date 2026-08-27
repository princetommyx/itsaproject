import { useState } from 'react'
import client from '../../../api/client'
import { Alert, Button, Card, Input } from '../../../components/ui'

export default function StaffManagement() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('assessor')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await client.post('/admin/staff', { name, email, role, password })
      setMessage(`${role === 'admin' ? 'Administrator' : 'Assessor'} account created for ${email}.`)
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-lg">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Onboard a Staff Account</h2>
      <p className="mb-4 text-sm text-slate-500">
        Create an Assessor or Admin account using their official UPSA email.
      </p>

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Official Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Role</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="assessor">Assessor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <Input
          label="Initial Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Account'}
        </Button>
      </form>
    </Card>
  )
}
