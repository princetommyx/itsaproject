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

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: projectData, error: swrError, mutate } = useSWR('/student/project')
  const [error, setError] = useState('')

  const project = projectData?.project
  const isLoading = !projectData && !swrError

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

      {!project ? (
        <CreateProjectForm onCreated={() => mutate()} onError={setError} />
      ) : (
        <ProjectPanel project={project} user={user} onChange={() => mutate()} onError={setError} />
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
      await client.post('/student/projects', { title, description })
      toast.success('Project draft created successfully', {
        description: 'Add your group members and documents, then submit it when you’re ready for review.',
      })
      onCreated()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not create project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-slate-900">Start a Project Draft</h2>
      <p className="mb-4 text-sm text-slate-500">
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words text-slate-800">{project.title}</h2>
          <p className="mt-1.5 text-[15px] leading-[1.75] text-slate-800">{project.description}</p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
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

        {project.status === 'refine' && project.feedback && (
          <div className="mt-4">
            <Alert variant="info">
              <strong>Supervisor feedback:</strong> {project.feedback}
            </Alert>
          </div>
        )}

        {project.status === 'approved' && (
          <div className="mt-4">
            <Alert variant="success">
              <strong>Your topic has been approved!</strong> Head to{' '}
              <Link to="/student/documents" className="underline">
                My Documents
              </Link>{' '}
              to upload your project write-up as you complete it.
            </Alert>
          </div>
        )}

        {isLeader && editable && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-upsa-blue/15 bg-blue-50/60 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isResubmission ? 'Ready to resubmit?' : 'Ready to submit?'}
              </p>
              <p className="text-xs text-slate-500">
                {isResubmission
                  ? 'Once you’ve made the requested changes, resubmit for another review.'
                  : 'You can submit as soon as your group and documents are set — or keep editing below first.'}
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

        <div className="mt-5 rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Submission Status</h3>
            <Link to="/student/documents" className="text-xs text-upsa-blue hover:underline">
              Manage Documents
            </Link>
          </div>
          <ul className="space-y-2">
            {CORE_SUBMISSION_TYPES.map((key) => {
              const uploaded = (project.documents ?? []).some((d) => d.type === key)
              return (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                      uploaded ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {uploaded ? '✓' : ''}
                  </span>
                  <span className={uploaded ? 'text-slate-700' : 'text-slate-400'}>
                    {DOCUMENT_TYPE_LABELS[key]}
                  </span>
                  {!uploaded && <span className="text-xs text-slate-400">— Pending</span>}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Group Members <span className="font-normal text-slate-400">({members.length})</span>
          </h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.student ? m.student.name : m.university_id} className="h-7 w-7 text-[10px]" />
                  <span className="min-w-0 truncate">
                    {m.student ? m.student.name : m.university_id}
                    {m.is_leader && <span className="ml-1 text-xs text-upsa-blue">(Leader)</span>}
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
          <EditAndSubmit project={project} onChange={onChange} onError={onError} toast={toast} />
        )}
      </Card>
    </div>
  )
}

async function submitProject(project, onChange, onError, toast, setSubmitting) {
  const isResubmission = project.status === 'refine'
  onError('')
  setSubmitting(true)
  try {
    await client.post(`/student/projects/${project.id}/submit`)
    toast.success(isResubmission ? 'Submission resubmitted successfully' : 'Project submitted successfully', {
      description: isResubmission
        ? 'Your revised project has been sent back to your supervisor for review.'
        : 'Your final-year project has been submitted for review.',
    })
    onChange()
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
    await client.delete(`/student/projects/${projectId}/members/${memberId}`)
    toast.success('Group member removed successfully')
    onChange()
  } catch (err) {
    onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not remove member.')
  }
}

function AddMemberForm({ projectId, onChange, onError, toast }) {
  const [universityId, setUniversityId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.post(`/student/projects/${projectId}/members`, { university_id: universityId })
      toast.success('Group member added successfully', {
        description: `${universityId} has been added to your project group.`,
      })
      setUniversityId('')
      onChange()
      inputRef.current?.focus()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not add member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-2 text-xs text-slate-500">
        Add as many group members as your project needs — groups are usually 2 to 4 people. If a
        partner hasn't been added to the system yet, that's fine: add their Index Number now and
        it'll link to their account automatically once they are.
      </p>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          label="Add Member by Index Number"
          value={universityId}
          onChange={(e) => setUniversityId(e.target.value)}
          className="flex-1"
          required
          autoFocus
        />
        <Button type="submit" variant="secondary" className="sm:shrink-0" disabled={submitting} loading={submitting}>
          {submitting ? 'Adding...' : '+ Add Member'}
        </Button>
      </form>
    </div>
  )
}

function EditAndSubmit({ project, onChange, onError, toast }) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description)
  const [submitting, setSubmitting] = useState(false)

  async function saveEdits(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.put(`/student/projects/${project.id}`, { title, description })
      toast.success('Project details saved successfully')
      onChange()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-6 space-y-4 border-t border-slate-100 pt-6" onSubmit={saveEdits}>
      <h3 className="text-sm font-semibold text-slate-700">Edit Project</h3>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" disabled={submitting} loading={submitting}>
          Save Changes
        </Button>
        <Button
          type="button"
          onClick={() => submitProject(project, onChange, onError, toast, setSubmitting)}
          disabled={submitting}
          loading={submitting}
        >
          {project.status === 'refine' ? 'Resubmit Project' : 'Submit Project'}
        </Button>
      </div>
    </form>
  )
}
