import { useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Alert, Button, Card, Input, PageHeading } from '../../../components/ui'

export default function StaffManagement() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('assessor')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await client.post('/admin/staff', { name, email, role, password })
      toast.success(role === 'admin' ? 'Administrator added successfully' : 'Assessor added successfully', {
        description: `${email} can now sign in with their new account.`,
      })
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
    <div className="space-y-6">
      <PageHeading description="Onboard assessors and fellow admins with an official UPSA email.">
        Staff Accounts
      </PageHeading>
      <Card className="max-w-lg">
        <h2 className="mb-4 text-lg font-bold text-foreground">Onboard a Staff Account</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Create an Assessor or Admin account using their official UPSA email.
        </p>

        {error && <Alert>{error}</Alert>}

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
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Role</span>
            <select
              className="w-full rounded-lg border border-border px-3 py-2.5 text-[15px] font-medium text-foreground transition duration-150 hover:border-ring/60 focus:border-brand-ink focus:ring-4 focus:ring-ring/25 focus:outline-none"
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
          <Button type="submit" disabled={submitting} loading={submitting}>
            {submitting ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
