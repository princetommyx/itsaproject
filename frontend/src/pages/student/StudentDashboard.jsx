import { useEffect, useRef, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Alert, Button, Card, Input, StatCard, Textarea, STATUS_LABELS, STATUS_VARIANTS } from '../../components/ui'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [project, setProject] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/student/project').then((res) => setProject(res.data.project))
  }

  if (project === undefined) {
    return <p className="text-slate-500">Loading...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">My Project</h1>
      {error && <Alert>{error}</Alert>}

      {!project ? (
        <CreateProjectForm onCreated={load} onError={setError} />
      ) : (
        <ProjectPanel project={project} user={user} onChange={load} onError={setError} />
      )}
    </div>
  )
}

function CreateProjectForm({ onCreated, onError }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.post('/student/projects', { title, description })
      onCreated()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not create project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Start a Project Draft</h2>
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Draft'}
        </Button>
      </form>
    </Card>
  )
}

function ProjectPanel({ project, user, onChange, onError }) {
  const members = project.members
  const isLeader = members.some((m) => m.student_id === user.id && m.is_leader)
  const editable = ['draft', 'refine'].includes(project.status)

  return (
    <div className="space-y-6">
      <Card>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words text-slate-800">{project.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{project.description}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Status"
            value={STATUS_LABELS[project.status] || project.status}
            variant={STATUS_VARIANTS[project.status] || 'slate'}
          />
          <StatCard label="Group Members" value={members.length} variant="blue" />
          {project.assessor && <StatCard label="Assessor" value={project.assessor.name} variant="violet" />}
        </div>

        {project.status === 'refine' && project.feedback && (
          <div className="mt-4">
            <Alert variant="info">
              <strong>Assessor feedback:</strong> {project.feedback}
            </Alert>
          </div>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Group Members <span className="font-normal text-slate-400">({members.length})</span>
          </h3>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {m.student ? m.student.name : m.university_id}
                  {m.is_leader && <span className="ml-1 text-xs text-upsa-blue">(Leader)</span>}
                  {!m.student && (
                    <span className="ml-1 text-xs text-amber-600" title="This student hasn't been added to the system yet — they'll link up automatically once they are.">
                      (Not yet registered)
                    </span>
                  )}
                </span>
                {isLeader && editable && !m.is_leader && (
                  <button
                    className="shrink-0 text-xs text-red-600 hover:underline"
                    onClick={() => removeMember(project.id, m.id, onChange, onError)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isLeader && editable && <AddMemberForm projectId={project.id} onChange={onChange} onError={onError} />}

        {isLeader && editable && (
          <EditAndSubmit project={project} onChange={onChange} onError={onError} />
        )}
      </Card>
    </div>
  )
}

async function removeMember(projectId, memberId, onChange, onError) {
  onError('')
  try {
    await client.delete(`/student/projects/${projectId}/members/${memberId}`)
    onChange()
  } catch (err) {
    onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not remove member.')
  }
}

function AddMemberForm({ projectId, onChange, onError }) {
  const [universityId, setUniversityId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.post(`/student/projects/${projectId}/members`, { university_id: universityId })
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
        <Button type="submit" variant="secondary" className="sm:shrink-0" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add Member'}
        </Button>
      </form>
    </div>
  )
}

function EditAndSubmit({ project, onChange, onError }) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description)
  const [submitting, setSubmitting] = useState(false)

  async function saveEdits(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.put(`/student/projects/${project.id}`, { title, description })
      onChange()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitProject() {
    onError('')
    setSubmitting(true)
    try {
      await client.post(`/student/projects/${project.id}/submit`)
      onChange()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not submit project.')
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
        <Button type="submit" variant="secondary" disabled={submitting}>
          Save Changes
        </Button>
        <Button type="button" onClick={submitProject} disabled={submitting}>
          Submit Project
        </Button>
      </div>
    </form>
  )
}
