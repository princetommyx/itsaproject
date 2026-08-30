import { useRef, useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Alert, Button, Card, PageHeading } from '../../../components/ui'
import { FileSpreadsheetIcon, UploadCloudIcon, XIcon } from '../../../components/icons'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImportStudents() {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  function pickFile(candidate) {
    if (!candidate) return
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file.')
      return
    }
    setError('')
    setResult(null)
    setFile(candidate)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  function discard() {
    setFile(null)
    setProgress(0)
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    if (!file) return
    setError('')
    setResult(null)
    setSubmitting(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      setResult(res.data)
      const count = res.data.created.length
      toast.success(count === 1 ? 'Student added successfully' : 'Students added successfully', {
        description: `${count} student account${count === 1 ? '' : 's'} ${count === 1 ? 'was' : 'were'} created from the CSV file.`,
      })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Bulk-create student accounts from a CSV roster.">Import Students</PageHeading>
      <Card className="max-w-xl">
        <h2 className="mb-4 text-lg font-bold text-foreground">Upload CSV File</h2>

        {error && <Alert>{error}</Alert>}

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? 'border-brand bg-blue-50' : 'border-border hover:border-ring/60'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand">
            <UploadCloudIcon />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Drag CSV here</p>
            <p className="text-xs text-muted-foreground">or, click to browse (4 MB max)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => pickFile(e.target.files[0])}
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Columns required: <code className="rounded bg-muted px-1">Student Name</code>,{' '}
          <code className="rounded bg-muted px-1">Index Number</code>,{' '}
          <code className="rounded bg-muted px-1">Email</code>,{' '}
          <code className="rounded bg-muted px-1">Date of Birth</code>. The hashed DOB (YYYYMMDD)
          becomes each student's initial password.
        </p>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <FileSpreadsheetIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              {submitting && (
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-brand transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            {!submitting && (
              <button
                onClick={discard}
                aria-label="Remove file"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon />
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={discard} disabled={!file || submitting}>
            Discard
          </Button>
          <Button onClick={handleImport} disabled={!file || submitting}>
            {submitting ? `Importing... ${progress}%` : 'Import'}
          </Button>
        </div>

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
    </div>
  )
}
