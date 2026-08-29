import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Alert, Avatar, Badge, Button, Card, Textarea } from '../../../components/ui'
import { Skeleton, SkeletonCard } from '../../../components/Skeleton'
import StatusTimeline from '../../../components/StatusTimeline'
import ProjectDocumentList from '../../../components/ProjectDocumentList'

export default function AdminProjectReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  
  const { data: project, error: projectError, mutate: mutateProject } = useSWR(`/admin/projects/${id}`)
  const { data: assessors, error: assessorsError } = useSWR('/admin/assessors')
  const isLoading = !project && !projectError

  const [selectedAssessor, setSelectedAssessor] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function assign() {
    setError('')
    if (!selectedAssessor) {
      setError('Select an assessor first.')
      return
    }
    setAssigning(true)
    try {
      await client.post(`/admin/projects/${id}/assign`, { assessor_id: selectedAssessor })
      const assessorName = (assessors || []).find((a) => String(a.id) === String(selectedAssessor))?.name
      toast.success('Project assigned successfully', {
        description: assessorName ? `${assessorName} has been assigned to review this project.` : undefined,
      })
      mutateProject()
    } catch (err) {
      const message = err.response?.data?.message
      setError(message || 'Could not assign assessor.')
      toast.error('Unable to assign assessor', { description: message || 'Something went wrong. Please try again.' })
    } finally {
      setAssigning(false)
    }
  }

  async function decide(decision) {
    setError('')
    if (decision === 'refine' && !feedback.trim()) {
      setError('Feedback is required when sending a project back for refinement.')
      return
    }
    setSubmitting(true)
    try {
      await client.post(`/admin/projects/${id}/decide`, { decision, feedback })
      toast.success('Project status updated successfully', {
        description:
          decision === 'approved'
            ? 'The project has been approved and the student has been notified.'
            : 'The project has been sent back for refinement and the student has been notified.',
      })
      navigate('/admin/projects')
    } catch (err) {
      const message = err.response?.data?.message
      setError(message || 'Could not submit decision.')
      toast.error('Unable to update project', { description: message || 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
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
  
  if (!project) return null;

  const awaitingDecision = ['pending', 'submitted_unassigned'].includes(project.status)

  return (
    <div className="space-y-6">
      <Link to="/admin/projects" className="text-sm text-upsa-blue hover:underline">
        &larr; Back to all projects
      </Link>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-semibold text-slate-800">{project.title}</h1>
          <Badge status={project.status} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-600">{project.description}</p>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <StatusTimeline status={project.status} />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Group Members</h3>
            <ul className="space-y-2">
              {project.members.map((m) => {
                const name = m.student ? m.student.name : m.university_id
                return (
                  <li key={m.id} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Avatar name={name} className="h-7 w-7 text-[10px]" />
                    {name}
                    {m.is_leader && <span className="text-xs text-upsa-blue">(Leader)</span>}
                    {!m.student && <span className="text-xs text-amber-600">(Not yet registered)</span>}
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Assessor</h3>
            <p className="text-sm text-slate-600">{project.assessor?.name ?? 'Unassigned'}</p>
          </div>
        </div>

        {project.status === 'refine' && project.feedback && (
          <div className="mt-5">
            <Alert variant="info">
              <strong>Feedback given:</strong> {project.feedback}
            </Alert>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Submitted Documents</h3>
          <ProjectDocumentList documents={project.documents} />
        </div>

        {awaitingDecision ? (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
            {project.status === 'submitted_unassigned' ? (
              <>
                <p className="text-xs text-slate-400">
                  This project hasn't been assigned an assessor yet. You can assign one to review it, or decide on
                  it yourself right now.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] font-medium text-slate-900 transition duration-150 hover:border-slate-300 focus:border-upsa-blue focus:ring-4 focus:ring-upsa-blue/10 focus:outline-none sm:w-auto"
                    value={selectedAssessor}
                    onChange={(e) => setSelectedAssessor(e.target.value)}
                  >
                    <option value="">Select assessor...</option>
                    {(assessors || []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" onClick={assign} disabled={assigning} loading={assigning} className="sm:shrink-0">
                    Assign Assessor
                  </Button>
                </div>
                <p className="text-xs text-slate-400">— or —</p>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                This project is assigned to {project.assessor?.name ?? 'an assessor'}. As an admin you can
                also decide on it directly — for example if the assessor is unavailable.
              </p>
            )}
            {error && <Alert>{error}</Alert>}
            <Textarea
              label="Feedback (required if sending back for refinement)"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="success" onClick={() => decide('approved')} disabled={submitting} loading={submitting}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => decide('refine')} disabled={submitting} loading={submitting}>
                Send Back for Refinement
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
            This project has already been reviewed. Decision: <Badge status={project.status} />
          </p>
        )}
      </Card>
    </div>
  )
}
