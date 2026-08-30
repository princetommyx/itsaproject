import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { Avatar, Badge, Card, EmptyState, PageHeading, stagger } from '../../../components/ui'
import { SkeletonCardGrid } from '../../../components/Skeleton'
import { FolderIcon } from '../../../components/icons'
import { memberName } from '../../../lib/memberName'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Under Review' },
  { key: 'submitted_unassigned', label: 'Awaiting Assignment' },
  { key: 'approved', label: 'Approved' },
  { key: 'refine', label: 'Needs Refinement' },
]

export default function AllProjects() {
  const { data: projects, error: swrError } = useSWR('/admin/projects')
  const isLoading = !projects && !swrError
  const [filter, setFilter] = useState('all')

  const visible = projects?.filter((p) => filter === 'all' || p.status === filter) ?? []

  return (
    <div className="space-y-6">
      <PageHeading description="Every submitted project, with its current status, group, and assessor.">
        All Projects
      </PageHeading>

      <div className="relative -mx-4 sm:mx-0">
        {/* pb-3 keeps the horizontal scrollbar off the tabs — without it the
            bar sits flush against them on mobile, which reads as one cramped
            element rather than tabs with a scroll affordance under them. */}
        <div className="overflow-x-auto px-4 pb-3 sm:px-0 sm:pb-0">
          <div className="flex gap-2.5 whitespace-nowrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                  filter === f.key
                    ? 'bg-brand text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {/* Hints that the tab row scrolls — otherwise the last tab or two is just cut off on mobile with no clue more exist. */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-muted to-transparent sm:hidden" />
      </div>

      {isLoading ? (
        <SkeletonCardGrid />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={FolderIcon} title="No projects match this filter" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((project, i) => {
            const leader = project.members.find((m) => m.is_leader) ?? project.members[0]
            const leaderName = leader ? memberName(leader) : 'Unassigned'

            return (
              <Link
                key={project.id}
                to={`/admin/projects/${project.id}`}
                className="animate-fade-up"
                style={stagger(i)}
              >
                <Card interactive className="h-full">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words font-semibold text-foreground">{project.title}</h2>
                    <Badge status={project.status} />
                  </div>
                  <p className="line-clamp-2 text-[15px] leading-[1.7] text-foreground">{project.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={leaderName} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{leaderName}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{project.assessor?.name ?? 'Unassigned'}</p>
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
