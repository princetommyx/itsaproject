import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { Alert, Button, Card } from '../../../components/ui'

export default function Assignments() {
  const [projects, setProjects] = useState(null)
  const [assessors, setAssessors] = useState([])
  const [selection, setSelection] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    client.get('/admin/assessors').then((res) => setAssessors(res.data))
  }, [])

  function load() {
    client.get('/admin/projects/unassigned').then((res) => setProjects(res.data))
  }

  async function assign(projectId) {
    setError('')
    const assessorId = selection[projectId]
    if (!assessorId) {
      setError('Select an assessor first.')
      return
    }
    try {
      await client.post(`/admin/projects/${projectId}/assign`, { assessor_id: assessorId })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign assessor.')
    }
  }

  if (projects === null) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {projects.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No projects are currently awaiting assignment.</p>
        </Card>
      ) : (
        projects.map((project) => (
          <Card key={project.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800">{project.title}</h3>
                <p className="text-sm text-slate-500 break-words">
                  {project.members.map((m) => m.student?.name ?? m.university_id).join(', ')}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-auto"
                  value={selection[project.id] || ''}
                  onChange={(e) => setSelection({ ...selection, [project.id]: e.target.value })}
                >
                  <option value="">Select assessor...</option>
                  {assessors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Button className="w-full sm:w-auto" onClick={() => assign(project.id)}>
                  Assign
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
