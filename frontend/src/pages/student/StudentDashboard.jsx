import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Alert, Badge, Button, Card, Input, Textarea } from '../../components/ui'

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

      <ComplaintsPanel />
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
  const isLeader = project.students.some((s) => s.id === user.id && s.pivot.is_leader)
  const editable = ['draft', 'refine'].includes(project.status)

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{project.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
          </div>
          <Badge status={project.status} />
        </div>

        {project.status === 'refine' && project.feedback && (
          <Alert variant="info">
            <strong>Assessor feedback:</strong> {project.feedback}
          </Alert>
        )}

        {project.assessor && (
          <p className="mt-3 text-sm text-slate-500">Assigned assessor: {project.assessor.name}</p>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Group Members</h3>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-100">
            {project.students.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {s.name} {!!s.pivot.is_leader && <span className="text-xs text-upsa-blue">(Leader)</span>}
                </span>
                {isLeader && editable && !s.pivot.is_leader && (
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => removeMember(project.id, s.id, onChange, onError)}
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

async function removeMember(projectId, studentId, onChange, onError) {
  onError('')
  try {
    await client.delete(`/student/projects/${projectId}/members/${studentId}`)
    onChange()
  } catch (err) {
    onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not remove member.')
  }
}

function AddMemberForm({ projectId, onChange, onError }) {
  const [universityId, setUniversityId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    onError('')
    setSubmitting(true)
    try {
      await client.post(`/student/projects/${projectId}/members`, { university_id: universityId })
      setUniversityId('')
      onChange()
    } catch (err) {
      onError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Could not add member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-4 flex items-end gap-2" onSubmit={handleSubmit}>
      <Input
        label="Add Member by Index Number"
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value)}
        className="flex-1"
        required
      />
      <Button type="submit" variant="secondary" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add'}
      </Button>
    </form>
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
      <div className="flex gap-2">
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

function ComplaintsPanel() {
  const [complaints, setComplaints] = useState([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/student/complaints').then((res) => setComplaints(res.data))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post('/student/complaints', { subject, message })
      setSubject('')
      setMessage('')
      load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Support Tickets</h2>
      <form className="mb-6 space-y-3" onSubmit={handleSubmit}>
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <Textarea label="Message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </Button>
      </form>

      {complaints.length === 0 ? (
        <p className="text-sm text-slate-500">No support tickets filed yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {complaints.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-slate-700">{c.subject}</p>
                <p className="text-slate-500">{c.message}</p>
              </div>
              <Badge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
