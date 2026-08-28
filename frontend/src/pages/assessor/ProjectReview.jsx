import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { Alert, Avatar, Badge, Button, Card, Textarea } from '../../components/ui'
import { Skeleton, SkeletonCard } from '../../components/Skeleton'
import StatusTimeline from '../../components/StatusTimeline'
import ProjectDocumentList from '../../components/ProjectDocumentList'

export default function ProjectReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [project, setProject] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  function load() {
    client.get(`/assessor/projects/${id}`).then((res) => setProject(res.data))
  }

  async function decide(decision) {
    setError('')
    if (decision === 'refine' && !feedback.trim()) {
      setError('Feedback is required when sending a project back for refinement.')
      return
    }
    setSubmitting(true)
    try {
      await client.post(`/assessor/projects/${id}/decide`, { decision, feedback })
      toast.success(decision === 'approved' ? 'Project approved.' : 'Project sent back for refinement.')
      navigate('/assessor')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit decision.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/assessor" className="text-sm text-upsa-blue hover:underline">
        &larr; Back to assigned projects
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

        <div className="mt-5">
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

        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Submitted Documents</h3>
          <ProjectDocumentList documents={project.documents} />
        </div>

        {project.status === 'pending' ? (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
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
