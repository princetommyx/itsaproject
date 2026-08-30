import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { downloadDocument, formatFileSize } from '../../lib/downloadDocument'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../constants/documentTypes'

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx']
const MAX_FILE_BYTES = 20 * 1024 * 1024
import { Alert, Button, Card, EmptyState, PageHeading } from '../../components/ui'
import { SkeletonCard } from '../../components/Skeleton'
import { FileSpreadsheetIcon, UploadCloudIcon } from '../../components/icons'

export default function StudentDocuments() {
  const toast = useToast()
  const { data: projectData, error: swrError, mutate } = useSWR('/student/project')
  const [type, setType] = useState(DOCUMENT_TYPES[0].key)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expandedType, setExpandedType] = useState(null)
  const [submittingId, setSubmittingId] = useState(null)
  const inputRef = useRef(null)

  const project = projectData?.project
  const isLoading = !projectData && !swrError

  function pickFile(file) {
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error('This file type is not supported.', {
        description: 'Upload a PDF or Word document.',
      })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('This file exceeds the maximum allowed size.', {
        description: 'Documents must be 20MB or smaller.',
      })
      return
    }

    upload(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  async function upload(file) {
    setError('')
    setSubmitting(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('file', file)
      await client.post(`/student/projects/${project.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      toast.success('Document uploaded', {
        description: `Check it's the right file, then tap Submit for Review to send it.`,
      })
      mutate()
    } catch (err) {
      const message = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null
      setError(message || 'Could not upload document.')
      toast.error('Document upload failed', {
        description: message || 'We couldn’t upload your file. Please try again.',
        actions: [{ label: 'Retry', onClick: () => upload(file) }, { label: 'Dismiss', variant: 'muted' }],
      })
    } finally {
      setSubmitting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDownload(document) {
    try {
      await downloadDocument(document)
    } catch {
      toast.error('Could not download this file.')
    }
  }

  async function handleDelete(document) {
    try {
      await client.delete(`/student/projects/${project.id}/documents/${document.id}`)
      toast.success('Document removed successfully')
      mutate()
    } catch {
      toast.error('Unable to remove this document', { description: 'Please try again.' })
    }
  }

  async function handleSubmitDocument(document, label) {
    setSubmittingId(document.id)
    try {
      await client.post(`/student/projects/${project.id}/documents/${document.id}/submit`)
      toast.success(`${label} submitted for review`, {
        description: 'It has been sent for review and can no longer be removed.',
      })
      mutate()
    } catch (err) {
      const message = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null
      toast.error('Could not submit this document', {
        description: message || 'Please try again.',
      })
    } finally {
      setSubmittingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading>My Documents</PageHeading>
        <SkeletonCard lines={2} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeading>My Documents</PageHeading>
        <Card>
          <EmptyState
            icon={FileSpreadsheetIcon}
            title="Start a project first"
            description="You'll be able to upload documents once you've created your project."
          />
          <div className="mt-4 flex justify-center">
            <Link to="/student">
              <Button variant="secondary">Go to My Project</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const editable = ['draft', 'refine', 'approved'].includes(project.status)
  const documents = project.documents ?? []
  const byType = Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.key, documents.filter((d) => d.type === t.key)]))

  return (
    <div className="space-y-6">
      <PageHeading description="Upload your project proposal, then your final project work document once your topic is approved.">
        My Documents
      </PageHeading>

      {editable ? (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Upload a Document</h2>
          {error && <Alert>{error}</Alert>}

          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">Document Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] font-medium text-slate-900 transition duration-150 hover:border-slate-300 focus:border-upsa-blue focus:ring-4 focus:ring-upsa-blue/10 focus:outline-none sm:w-72"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !submitting && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging ? 'border-upsa-blue bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            } ${submitting ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-upsa-blue">
              <UploadCloudIcon />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {submitting ? `Uploading... ${progress}%` : 'Drag your file here'}
              </p>
              <p className="text-xs text-slate-400">or, click to browse (PDF or Word — 20MB max)</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
          </div>
        </Card>
      ) : (
        <Alert variant="info">
          Documents can only be uploaded once your project is a draft, needs refinement, or has been approved —
          it's currently under review, so it's locked from changes for now.
        </Alert>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Your Documents</h2>
        <ul className="divide-y divide-slate-100">
          {DOCUMENT_TYPES.map((t) => {
            const versions = byType[t.key]
            const current = versions[0]
            const history = versions.slice(1)

            return (
              <li key={t.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{t.label}</p>
                    {current ? (
                      <>
                        <p className="truncate text-xs text-slate-500">
                          {current.original_filename} · {formatFileSize(current.size_bytes)} ·{' '}
                          {new Date(current.created_at).toLocaleDateString()}
                        </p>
                        {current.submitted_at ? (
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            ✓ Submitted for review on {new Date(current.submitted_at).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Uploaded — not submitted for review yet
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Not yet uploaded</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {current && (
                      <Button variant="secondary" className="text-xs" onClick={() => handleDownload(current)}>
                        Download
                      </Button>
                    )}
                    {/* Submitting is a separate, deliberate step from uploading,
                        so a wrong file can be swapped out before it ever
                        goes for review. */}
                    {current && !current.submitted_at && (
                      <Button
                        variant="outline"
                        className="text-xs"
                        disabled={submittingId === current.id}
                        loading={submittingId === current.id}
                        onClick={() => handleSubmitDocument(current, t.label)}
                      >
                        {submittingId === current.id ? 'Submitting...' : 'Submit for Review'}
                      </Button>
                    )}
                    {current && editable && !current.submitted_at && (
                      <button
                        onClick={() => handleDelete(current)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                    {history.length > 0 && (
                      <button
                        onClick={() => setExpandedType(expandedType === t.key ? null : t.key)}
                        className="text-xs text-upsa-blue hover:underline"
                      >
                        {expandedType === t.key ? 'Hide' : `History (${history.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {expandedType === t.key && history.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-l-2 border-slate-100 pl-3">
                    {history.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span className="truncate">
                          {doc.original_filename} · {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <button onClick={() => handleDownload(doc)} className="shrink-0 text-upsa-blue hover:underline">
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
