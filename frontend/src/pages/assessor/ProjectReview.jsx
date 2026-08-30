import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { Alert, Avatar, Badge, Button, Card, ErrorState, Textarea } from '../../components/ui'
import { Skeleton, SkeletonCard } from '../../components/Skeleton'
import StatusTimeline from '../../components/StatusTimeline'
import ProjectDocumentList from '../../components/ProjectDocumentList'
import SubmissionHistory from '../../components/SubmissionHistory'

export default function ProjectReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  
  const { data: project, error: swrError, mutate } = useSWR(`/assessor/projects/${id}`)
  const isLoading = !project && !swrError

  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(null)

  async function decide(decision) {
    setError('')
    if (decision === 'refine' && !feedback.trim()) {
      setError('Feedback is required when sending a project back for refinement.')
      return
    }
    setSubmitting(decision)
    try {
      await client.post(`/assessor/projects/${id}/decide`, { decision, feedback })
      toast.success(
        decision === 'approved' ? 'Project approved successfully' : 'Revision request sent successfully',
        {
          description:
            decision === 'approved'
              ? 'The student has been notified of your decision.'
              : 'The student has been notified and can now resubmit their project.',
        }
      )
      navigate('/assessor')
    } catch (err) {
      const message = err.response?.data?.message
      setError(message || 'Could not submit decision.')
      toast.error(decision === 'approved' ? 'Project approval failed' : 'Unable to submit feedback', {
        description: message || 'Something went wrong. Please try again.',
      })
    } finally {
      setSubmitting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <SkeletonCard lines={4} />
      </div>
    )
  }
  
  // A failed load used to fall through to `return null`, which is exactly the
  // blank page it looks like. Say what happened and offer a way back instead.
  if (swrError || !project) {
    return (
      <div className="space-y-6">
        <Link to="/assessor" className="text-sm text-brand-ink hover:underline">
          &larr; Back to assigned projects
        </Link>
        <Card>
          <ErrorState
            title="Couldn't load this project"
            description="It may no longer be assigned to you, or the server couldn't be reached."
            onRetry={() => mutate()}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/assessor" className="text-sm text-brand-ink hover:underline">
        &larr; Back to assigned projects
      </Link>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-semibold text-foreground">{project.title}</h1>
          <Badge status={project.status} />
        </div>
        <p className="text-[15px] leading-[1.75] whitespace-pre-wrap text-foreground">{project.description}</p>

        <div className="mt-5 border-t border-border pt-5">
          <StatusTimeline status={project.status} />
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Group Members</h3>
          <ul className="space-y-2">
            {project.members.map((m) => {
              const name = m.student ? m.student.name : m.university_id
              return (
                <li key={m.id} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Avatar name={name} className="h-7 w-7 text-[10px]" />
                  {name}
                  {m.is_leader && <span className="text-xs text-brand-ink">(Leader)</span>}
                  {!m.student && <span className="text-xs text-amber-600">(Not yet registered)</span>}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Submitted Documents</h3>
          <ProjectDocumentList documents={project.documents} />
        </div>

        {/* Nothing here is ever removed — the version an earlier review sent
            back stays put, which is what makes a comparison possible. */}
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Submission History</h3>
            {(project.versions?.length ?? 0) > 1 && (
              <Link
                to={`/assessor/projects/${project.id}/compare`}
                className="text-sm font-semibold text-brand-ink hover:underline"
              >
                Compare versions
              </Link>
            )}
          </div>
          <SubmissionHistory versions={project.versions} compareBase={`/assessor/projects/${project.id}/compare`} />
        </div>

        {project.status === 'pending' ? (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            {error && <Alert>{error}</Alert>}
            <Textarea
              label="Feedback (required if sending back for refinement)"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="success" onClick={() => decide('approved')} disabled={!!submitting} loading={submitting === 'approved'}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => decide('refine')} disabled={!!submitting} loading={submitting === 'refine'}>
                Send Back for Refinement
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            This project has already been reviewed. Decision: <Badge status={project.status} />
          </p>
        )}
      </Card>
    </div>
  )
}
