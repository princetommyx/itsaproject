import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../../api/client'
import { Badge, Card } from '../../../components/ui'
import { SkeletonCardGrid } from '../../../components/Skeleton'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Under Review' },
  { key: 'submitted_unassigned', label: 'Awaiting Assignment' },
  { key: 'approved', label: 'Approved' },
  { key: 'refine', label: 'Needs Refinement' },
]

export default function AllProjects() {
  const [projects, setProjects] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    client.get('/admin/projects').then((res) => setProjects(res.data))
  }, [])

  const visible = projects?.filter((p) => filter === 'all' || p.status === filter) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">All Projects</h1>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 whitespace-nowrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? 'bg-upsa-blue text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {projects === null ? (
        <SkeletonCardGrid />
      ) : visible.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No projects match this filter.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((project) => (
            <Link key={project.id} to={`/admin/projects/${project.id}`}>
              <Card className="h-full transition hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words font-semibold text-slate-800">{project.title}</h2>
                  <Badge status={project.status} />
                </div>
                <p className="line-clamp-2 text-sm text-slate-500">{project.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {project.members.map((m) => m.student?.name ?? m.university_id).join(', ')}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Assessor: {project.assessor?.name ?? 'Unassigned'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
