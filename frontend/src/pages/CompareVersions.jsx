import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import useSWR from 'swr'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Alert, Badge, Button, Card, ErrorState, PageHeading, Textarea } from '../components/ui'
import { SkeletonCard } from '../components/Skeleton'
import ProjectDocumentList from '../components/ProjectDocumentList'
import RequiredChangesList from '../components/RequiredChangesList'
import { formatDateTime } from '../lib/formatDate'

/**
 * The reason versioning exists: the version that was sent back, beside the
 * one submitted to answer it, so a reviewer can check whether the feedback
 * was actually addressed instead of taking the student's word for it.
 *
 * Shared by admins and assessors — the comparison is identical, only the
 * route prefix and the decision endpoint differ.
 */
export default function CompareVersions({ apiPrefix, backTo }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()

  const currentParam = params.get('current')
  const key = `/projects/${id}/compare${currentParam ? `?current=${currentParam}` : ''}`
  const { data, error: swrError, mutate } = useSWR(key)
  const isLoading = !data && !swrError

  const back = (
    <Link to={`${backTo}/${id}`} className="text-sm text-brand hover:underline">
      &larr; Back to project
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (swrError || !data) {
    return (
      <div className="space-y-6">
        {back}
        <Card>
          <ErrorState
            title="Couldn't load the comparison"
            description="This project may have no submissions yet, or the server couldn't be reached."
            onRetry={() => mutate()}
          />
        </Card>
      </div>
    )
  }

  const { previous, current, changes, project } = data

  return (
    <div className="space-y-6">
      {back}

      <PageHeading description={project?.title}>Compare Versions</PageHeading>

      {!previous ? (
        <Card>
          <Alert variant="info">
            <strong>{current.label} is the first submission.</strong> There is no earlier version to
            compare it against yet — a comparison becomes available once a revision is submitted.
          </Alert>
          <div className="mt-5">
            <VersionPanel version={current} tone="current" />
          </div>
        </Card>
      ) : (
        <>
          {/* Stacked on mobile so each panel keeps a readable measure; the
              side-by-side reading the feature is named for needs the width. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <VersionPanel version={previous} tone="previous" />
            <VersionPanel version={current} tone="current" />
          </div>

          {changes?.length > 0 && (
            <Card>
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Change Detected
              </p>
              <ul className="mt-2 space-y-1.5">
                {changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] font-medium text-foreground">
                    <span
                      className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    {change}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* The decision belongs here: the comparison is what it's based on, and
          making the reviewer navigate away to act on what they just read is
          how a judgement gets lost. */}
      {current.status === 'under_review' || current.status === 'submitted' ? (
        <DecisionCard
          projectId={id}
          apiPrefix={apiPrefix}
          onDecided={() => mutate()}
          toast={toast}
          reviewer={user}
        />
      ) : (
        <Card>
          <p className="text-sm font-medium text-muted-foreground">
            {current.label} has already been reviewed — decision:{' '}
            <span className="font-semibold text-foreground">
              {current.status === 'approved' ? 'Approved' : 'Revision Required'}
            </span>
            .
          </p>
        </Card>
      )}
    </div>
  )
}

function VersionPanel({ version, tone }) {
  const isCurrent = tone === 'current'

  return (
    <Card className={isCurrent ? 'border-brand/30' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-extrabold text-foreground">{version.label}</span>
          <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {isCurrent ? 'Current' : 'Previous'}
          </span>
        </div>
        <Badge status={version.status} />
      </div>

      <p className="mt-1 text-xs font-medium text-muted-foreground">
        {version.submitted_at
          ? `Submitted ${formatDateTime(version.submitted_at, { empty: '' })}`
          : 'Not submitted yet'}
        {version.submitter?.name && ` by ${version.submitter.name}`}
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Title</p>
          <p className="mt-1 text-[15px] font-semibold break-words text-foreground">{version.title}</p>
        </div>

        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Description</p>
          <p className="mt-1 text-[15px] leading-[1.75] whitespace-pre-wrap text-foreground">
            {version.description}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Documents</p>
          <ProjectDocumentList documents={version.documents ?? []} />
        </div>

        {version.feedback && (
          <div className="rounded-xl bg-pink-50 px-3.5 py-3">
            <p className="text-xs font-bold tracking-wide text-pink-700 uppercase">Reviewer Note</p>
            <p className="mt-1 text-sm font-medium text-pink-900">{version.feedback}</p>
          </div>
        )}

        <RequiredChangesList items={version.required_changes} />
      </div>
    </Card>
  )
}

/**
 * Approve, or send back with a reason and a checklist. Requesting a revision
 * keeps this version permanently and opens a fresh one for the student — the
 * submission is never replaced.
 */
function DecisionCard({ projectId, apiPrefix, onDecided, toast }) {
  const [feedback, setFeedback] = useState('')
  const [changes, setChanges] = useState([''])
  const [submitting, setSubmitting] = useState(null)
  const [error, setError] = useState('')

  function setChangeAt(index, value) {
    setChanges((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  async function decide(decision) {
    setError('')

    if (decision === 'refine' && !feedback.trim()) {
      setError('Feedback is required when sending a version back for revision.')
      return
    }

    setSubmitting(decision)
    try {
      await client.post(`${apiPrefix}/projects/${projectId}/decide`, {
        decision,
        feedback: decision === 'refine' ? feedback : null,
        required_changes: decision === 'refine' ? changes.map((c) => c.trim()).filter(Boolean) : [],
      })
      toast.success(
        decision === 'approved' ? 'Version approved' : 'Revision requested',
        {
          description:
            decision === 'approved'
              ? 'The group has been notified.'
              : 'This version is kept on record and the group can now submit a new one.',
        }
      )
      onDecided()
    } catch (err) {
      const message = err.response?.data?.message
      setError(message || 'Could not record this decision.')
      toast.error('Could not record this decision', { description: message || 'Please try again.' })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-foreground">Your Decision</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        Requesting a revision keeps this version on record permanently and lets the group submit a
        new one beside it.
      </p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <Textarea
          label="Feedback"
          rows={4}
          placeholder="Explain what needs to change and why."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-foreground">
            Required Changes (optional)
          </span>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            A short checklist the group can work through, alongside your written feedback.
          </p>
          <div className="space-y-2">
            {changes.map((change, i) => (
              <input
                key={i}
                value={change}
                onChange={(e) => setChangeAt(i, e.target.value)}
                placeholder={i === 0 ? 'e.g. Narrow project scope' : 'Add another change'}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[15px] font-medium text-foreground transition duration-150 placeholder:font-normal placeholder:text-muted-foreground hover:border-ring/60 focus:border-brand focus:ring-4 focus:ring-ring/25 focus:outline-none"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChanges((prev) => [...prev, ''])}
            className="mt-2 text-xs font-semibold text-brand hover:underline"
          >
            + Add another
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="success"
          onClick={() => decide('approved')}
          loading={submitting === 'approved'}
          disabled={submitting !== null}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          onClick={() => decide('refine')}
          loading={submitting === 'refine'}
          disabled={submitting !== null}
        >
          Request Revision
        </Button>
      </div>
    </Card>
  )
}
