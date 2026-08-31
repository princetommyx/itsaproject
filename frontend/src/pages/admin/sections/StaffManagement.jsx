import { useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Alert, Button, Card, Input, PageHeading } from '../../../components/ui'
import CsvImportCard from '../../../components/CsvImportCard'
import { cn } from '../../../lib/cn'

export default function StaffManagement() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('assessor')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Adding one account and importing many are the same job, so they live on
  // one page behind a toggle rather than as two sidebar entries.
  const [mode, setMode] = useState('single')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await client.post('/admin/staff', { name, email, role, password })
      toast.success(role === 'admin' ? 'Administrator added' : 'Assessor added', {
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
      <PageHeading description="Assessors and admins sign in with their official UPSA email.">
        Staff Accounts
      </PageHeading>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'single', label: 'Add one account' },
          { key: 'import', label: 'Import from CSV' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            aria-pressed={mode === tab.key}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              mode === tab.key
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'import' ? (
        <CsvImportCard
          endpoint="/admin/staff/import"
          noun="staff account"
          columns={
            <>
              Columns required: <code className="rounded bg-muted px-1">Staff Name</code>,{' '}
              <code className="rounded bg-muted px-1">Email</code>,{' '}
              <code className="rounded bg-muted px-1">Role</code>,{' '}
              <code className="rounded bg-muted px-1">Date of Birth</code>. Role must be{' '}
              <code className="rounded bg-muted px-1">assessor</code> or{' '}
              <code className="rounded bg-muted px-1">admin</code>. Staff sign in with their
              official email, and their date of birth as YYYYMMDD is the initial password — they
              are asked to change it before they can use the system.
            </>
          }
        />
      ) : (
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
      )}
    </div>
  )
}
