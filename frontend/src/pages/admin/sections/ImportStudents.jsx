import { useState } from 'react'
import client from '../../../api/client'
import { Alert, Button, Card } from '../../../components/ui'

export default function ImportStudents() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-slate-800">Import Students via CSV</h2>
      <p className="mb-4 text-sm text-slate-500">
        CSV columns: <code className="rounded bg-slate-100 px-1">Student Name</code>,{' '}
        <code className="rounded bg-slate-100 px-1">Index Number</code>,{' '}
        <code className="rounded bg-slate-100 px-1">Email</code>,{' '}
        <code className="rounded bg-slate-100 px-1">Date of Birth</code>. The hashed DOB (YYYYMMDD) becomes
        each student's initial password.
      </p>

      {error && <Alert>{error}</Alert>}

      <form className="mt-4 flex items-end gap-3" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm"
          required
        />
        <Button type="submit" disabled={submitting || !file}>
          {submitting ? 'Importing...' : 'Import'}
        </Button>
      </form>

      {result && (
        <div className="mt-6 space-y-3">
          <Alert variant="success">{result.created.length} student(s) imported successfully.</Alert>
          {result.errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="mb-1 font-semibold">Rows with errors:</p>
              <ul className="list-inside list-disc">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
