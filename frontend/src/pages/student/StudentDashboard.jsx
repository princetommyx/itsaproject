import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  Alert,
  Avatar,
  Button,
  Card,
  ErrorState,
  Input,
  PageHeading,
  StatCard,
  Textarea,
  STATUS_LABELS,
  STATUS_VARIANTS,
  stagger,
} from '../../components/ui'
import { Skeleton, SkeletonList, SkeletonStatCards } from '../../components/Skeleton'
import StatusTimeline from '../../components/StatusTimeline'
import { CORE_SUBMISSION_TYPES, DOCUMENT_TYPE_LABELS } from '../../constants/documentTypes'
import { memberName } from '../../lib/memberName'
import { formatDateTime } from '../../lib/formatDate'
import SubmissionHistory from '../../components/SubmissionHistory'
import RequiredChangesList from '../../components/RequiredChangesList'
import DocumentPreview from '../../components/DocumentPreview'
import { downloadDocument } from '../../lib/downloadDocument'

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: projectData, error: swrError, mutate } = useSWR('/student/project')
  const [error, setError] = useState('')

  const project = projectData?.project
  const isLoading = !projectData && !swrError

  // Every mutating endpoint returns the updated project in the same shape
  // GET /student/project uses, so write it straight into the cache. Waiting
  // on a re-fetch to show the result is what made the page look like it
  // hadn't reacted until you reloaded it — that round trip is slow.
  const applyProject = (updated) =>
    mutate({ project: updated }, { revalidate: false })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading>My Project</PageHeading>
        <Card>
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <div className="mt-4">
            <SkeletonStatCards />
          </div>
          <div className="mt-5">
            <Skeleton className="mb-2 h-3 w-32" />
            <SkeletonList rows={3} />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading>My Project</PageHeading>
      {error && <Alert>{error}</Alert>}

      {swrError ? (
        <Card>
          <ErrorState
            title="Couldn't load your project"
            description="We couldn't reach the server. Check your connection and try again."
            onRetry={() => mutate()}
          />
        </Card>
      ) : !project ? (
        <CreateProjectForm onCreated={applyProject} onError={setError} />
      ) : (
        <ProjectPanel project={project} user={user} onChange={applyProject} onError={setError} />
      )}
    </div>
  )
}

function CreateProjectForm({ onCreated, onError }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      const { data } = await client.post('/student/projects', { title, description })
      toast.success('Draft created', {
        description: 'Add your group members and documents, then submit it when you’re ready for review.',
      })
      onCreated(data)
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not create project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-foreground">Start a Project Draft</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        As the group leader, create your project draft, then add your group members by Index Number.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea
          label="Description / Methodology"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <Button type="submit" disabled={submitting} loading={submitting}>
          {submitting ? 'Creating...' : 'Create Draft'}
        </Button>
      </form>
    </Card>
  )
}

function ProjectPanel({ project, user, onChange, onError }) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const members = project.members
  const isLeader = members.some((m) => m.student_id === user.id && m.is_leader)
  const editable = ['draft', 'refine'].includes(project.status)
  const isResubmission = project.status === 'refine'
  const [preview, setPreview] = useState(null)

  return (
    <div className="space-y-6">
      <Card>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words text-foreground">{project.title}</h2>
          <p className="mt-1.5 text-[15px] leading-[1.75] text-foreground">{project.description}</p>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <StatusTimeline status={project.status} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Status"
            value={STATUS_LABELS[project.status] || project.status}
            variant={STATUS_VARIANTS[project.status] || 'slate'}
            className="animate-fade-up"
            style={stagger(0)}
          />
          <StatCard label="Group Members" value={members.length} variant="blue" className="animate-fade-up" style={stagger(1)} />
          {project.assessor && (
            <StatCard label="Supervisor" value={project.assessor.name} variant="violet" className="animate-fade-up" style={stagger(2)} />
          )}
        </div>

        {(project.versions?.length ?? 0) > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Submission History</h3>
            {/* Every version stays here. A submission that was sent back is
                not replaced by the one that answers it — both are part of the
                academic record. */}
            <SubmissionHistory versions={project.versions} />
          </div>
        )}

        {project.status === 'approved' && (project.proposal_defense_at || project.final_defense_at) && (
          <div className="mt-5 rounded-xl border border-brand-ink/20 bg-blue-500/10 p-4">
            <p className="text-sm font-bold text-foreground">Defense Schedule</p>
            <dl className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {project.proposal_defense_at && (
                <div>
                  <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Proposal Defense
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-foreground">
                    {formatDateTime(project.proposal_defense_at)}
                  </dd>
                </div>
              )}
              {project.final_defense_at && (
                <div>
                  <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Project Defense
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-foreground">
                    {formatDateTime(project.final_defense_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {project.status === 'refine' && <RevisionPanel project={project} />}

        {project.status === 'approved' && (
          <div className="mt-4">
            <Alert variant="success">
              <strong>Your topic has been approved.</strong> Upload your write-up in{' '}
              <Link to="/student/documents" className="underline">
                My Documents
              </Link>{' '}
              as you complete it.
            </Alert>
          </div>
        )}

        {isLeader && editable && (
          <EditProjectForm project={project} onChange={onChange} onError={onError} toast={toast} />
        )}

        <div className="mt-5 rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Submission Status</h3>
            <Link to="/student/documents" className="text-xs text-brand-ink hover:underline">
              Manage Documents
            </Link>
          </div>
          <ul className="space-y-2">
            {CORE_SUBMISSION_TYPES.map((key) => {
              // The most recent upload of this type, if any — the one that
              // would go for review, and so the one worth looking at.
              const current = (project.documents ?? []).find((d) => d.type === key)
              const uploaded = Boolean(current)
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                      uploaded ? 'bg-emerald-500' : 'bg-accent text-muted-foreground'
                    }`}
                  >
                    {uploaded ? '✓' : ''}
                  </span>
                  <span className={uploaded ? 'text-foreground' : 'text-muted-foreground'}>
                    {DOCUMENT_TYPE_LABELS[key]}
                  </span>
                  {!uploaded && <span className="text-xs text-muted-foreground">— Pending</span>}
                  {/* Checking the file is possible from here, rather than only
                      after a trip to My Documents: this panel is where a
                      student lands, and next to "Submit" the useful question
                      is "is this the right file?" */}
                  {current && (
                    <button
                      onClick={() => setPreview({ document: current, label: DOCUMENT_TYPE_LABELS[key] })}
                      className="ml-auto text-xs font-semibold text-brand-ink hover:underline"
                    >
                      Preview
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Group Members <span className="font-normal text-muted-foreground">({members.length})</span>
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={memberName(m)} className="h-7 w-7 text-[10px]" />
                  <span className="min-w-0 truncate">
                    {memberName(m)}
                    {/* Index Number stays visible alongside a typed name — it
                        is the identifier the group is actually matched on. */}
                    {!m.student && m.name && (
                      <span className="ml-1 text-xs text-muted-foreground">{m.university_id}</span>
                    )}
                    {m.is_leader && <span className="ml-1 text-xs text-brand-ink">(Leader)</span>}
                    {!m.student && (
                      <span className="ml-1 text-xs text-amber-600" title="This student hasn't been added to the system yet — they'll link up automatically once they are.">
                        (Not yet registered)
                      </span>
                    )}
                  </span>
                </span>
                {isLeader && editable && !m.is_leader && (
                  <button
                    className="shrink-0 text-xs text-red-600 hover:underline"
                    onClick={() => removeMember(project.id, m.id, onChange, onError, toast)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isLeader && editable && (
          <AddMemberForm projectId={project.id} onChange={onChange} onError={onError} toast={toast} />
        )}

        {isLeader && editable && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-ink/20 bg-blue-500/10 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isResubmission ? 'Ready to resubmit?' : 'Ready to submit?'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isResubmission
                  ? 'Once you’ve made the requested changes, resubmit for another review.'
                  : 'You can submit as soon as your group and documents are set.'}
              </p>
            </div>
            <Button
              onClick={() => submitProject(project, onChange, onError, toast, setSubmitting)}
              disabled={submitting}
              loading={submitting}
            >
              {isResubmission ? 'Resubmit Project' : 'Submit Project'}
            </Button>
          </div>
        )}
      </Card>

      {preview && (
        <DocumentPreview
          document={preview.document}
          label={preview.label}
          onClose={() => setPreview(null)}
          onDownload={downloadDocument}
        />
      )}
    </div>
  )
}

async function submitProject(project, onChange, onError, toast, setSubmitting) {
  const isResubmission = project.status === 'refine'
  onError('')
  setSubmitting(true)
  try {
    const { data } = await client.post(`/student/projects/${project.id}/submit`)
    toast.success(isResubmission ? 'Project resubmitted' : 'Project submitted', {
      description: isResubmission
        ? 'Your revised project has been sent back to your supervisor for review.'
        : 'Your final-year project has been submitted for review.',
    })
    onChange(data)
  } catch (err) {
    const message = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null
    onError(message || 'Could not submit project.')
    toast.error('Project submission failed', {
      description: message || 'We couldn’t submit your project. Please check your connection and try again.',
    })
  } finally {
    setSubmitting(false)
  }
}

async function removeMember(projectId, memberId, onChange, onError, toast) {
  onError('')
  try {
    const { data } = await client.delete(`/student/projects/${projectId}/members/${memberId}`)
    toast.success('Member removed')
    onChange(data)
  } catch (err) {
    onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not remove member.')
  }
}

function AddMemberForm({ projectId, onChange, onError, toast }) {
  const [universityId, setUniversityId] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      const { data } = await client.post(`/student/projects/${projectId}/members`, {
        university_id: universityId,
        name,
      })
      toast.success('Member added', {
        description: `${name.trim() || universityId} has been added to your project group.`,
      })
      setUniversityId('')
      setName('')
      onChange(data)
      inputRef.current?.focus()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not add member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-2 text-xs text-muted-foreground">
        Add as many group members as your project needs — groups are usually 2 to 4 people. If a
        partner hasn't been added to the system yet, that's fine: add their Index Number now and
        it'll link to their account automatically once they are. Adding their name too means the
        group can tell who they are in the meantime.
      </p>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          label="Index Number"
          value={universityId}
          onChange={(e) => setUniversityId(e.target.value)}
          className="flex-1"
          required
        />
        <Input
          label="Full Name (optional)"
          placeholder="e.g. Kwame Mensah"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" className="sm:shrink-0" disabled={submitting} loading={submitting}>
          {submitting ? 'Adding...' : '+ Add Member'}
        </Button>
      </form>
    </div>
  )
}

function EditProjectForm({ project, onChange, onError, toast }) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description)
  const [submitting, setSubmitting] = useState(false)

  async function saveEdits(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      const { data } = await client.put(`/student/projects/${project.id}`, { title, description })
      toast.success('Changes saved')
      onChange(data)
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-5 space-y-4 rounded-xl border border-border p-4" onSubmit={saveEdits}>
      <h3 className="text-sm font-semibold text-foreground">Edit Project Details</h3>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={submitting} loading={submitting}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}

/**
 * What the student sees when a version was sent back.
 *
 * The reviewer's decision lives on the version they judged, not on the
 * project, so this reads it from the history — which means the feedback stays
 * attached to the submission it was about even after the next one is filed.
 */
function RevisionPanel({ project }) {
  const reviewed = [...(project.versions ?? [])]
    .filter((v) => v.status === 'revision_required')
    .sort((a, b) => b.sequence - a.sequence)[0]

  const feedback = reviewed?.feedback ?? project.feedback
  if (!feedback && !reviewed?.required_changes?.length) return null

  return (
    <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50/70 p-4">
      <p className="text-sm font-bold text-pink-900">
        {reviewed ? `${reviewed.label} needs changes` : 'Changes requested'}
      </p>
      {feedback && (
        <p className="mt-1.5 text-[15px] leading-[1.7] whitespace-pre-wrap text-pink-900">
          {feedback}
        </p>
      )}
      <RequiredChangesList items={reviewed?.required_changes} className="mt-4" />
      <p className="mt-4 text-xs font-medium text-pink-800">
        Your previous submission is kept on record. Update your project below and submit a new
        version — nothing you already sent is lost.
      </p>
    </div>
  )
}
