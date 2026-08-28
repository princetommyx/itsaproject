import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../../api/client'
import { Avatar, Badge, Card, EmptyState, PageHeading } from '../../../components/ui'
import { SkeletonCardGrid } from '../../../components/Skeleton'
import { FolderIcon } from '../../../components/icons'

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
      <PageHeading description="Every submitted project, with its current status, group, and assessor.">
        All Projects
      </PageHeading>

      <div className="relative -mx-4 sm:mx-0">
        <div className="overflow-x-auto px-4 sm:px-0">
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
        {/* Hints that the tab row scrolls — otherwise the last tab or two is just cut off on mobile with no clue more exist. */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-slate-100 to-transparent sm:hidden" />
      </div>

      {projects === null ? (
        <SkeletonCardGrid />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={FolderIcon} title="No projects match this filter" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((project) => {
            const leader = project.members.find((m) => m.is_leader) ?? project.members[0]
            const leaderName = leader?.student?.name ?? leader?.university_id ?? 'Unassigned'

            return (
              <Link key={project.id} to={`/admin/projects/${project.id}`}>
                <Card interactive className="h-full">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words font-semibold text-slate-800">{project.title}</h2>
                    <Badge status={project.status} />
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-500">{project.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={leaderName} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">{leaderName}</p>
                        <p className="text-xs text-slate-400">
                          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-slate-400">{project.assessor?.name ?? 'Unassigned'}</p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
