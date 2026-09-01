import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeading,
} from '../../../components/ui'
import { SkeletonTable } from '../../../components/Skeleton'
import { FolderIcon, SearchIcon, XIcon } from '../../../components/icons'
import { memberName } from '../../../lib/memberName'
import { formatDateTime } from '../../../lib/formatDate'
import { cn } from '../../../lib/cn'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'submitted_unassigned', label: 'Awaiting Assignment' },
  { key: 'pending', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'refine', label: 'Needs Refinement' },
]

const STAGES = [
  { key: 'all', label: 'Any stage' },
  { key: 'proposal', label: 'Project Proposal' },
  { key: 'final', label: 'Final Project Work' },
]

const DEFENSE = [
  { key: 'all', label: 'Any defense status' },
  { key: 'scheduled', label: 'Defense scheduled' },
  { key: 'unscheduled', label: 'No defense set' },
]

const SORTS = [
  { key: 'recent', label: 'Recently updated' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'title', label: 'Title (A–Z)' },
  { key: 'group', label: 'Largest group' },
]

const DEFAULTS = { search: '', status: 'all', assessor: 'all', stage: 'all', defense: 'all', sort: 'recent' }

/**
 * Everything an admin can search a project by, in one string.
 *
 * Searching only the title is what made the old page useless for the question
 * actually being asked — "where is Ama Boateng's project" — because the person
 * looking usually knows a name or an index number, not the topic.
 */
function haystack(project) {
  return [
    project.title,
    project.description,
    project.assessor?.name,
    ...(project.members ?? []).flatMap((m) => [memberName(m), m.university_id]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function AllProjects() {
  const { data: projects, error: swrError, mutate } = useSWR('/admin/projects')
  const isLoading = !projects && !swrError
  const [filters, setFilters] = useState(DEFAULTS)

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const reset = (key) => setFilters((f) => ({ ...f, [key]: DEFAULTS[key] }))

  const assessors = useMemo(() => {
    const named = new Map()
    for (const p of projects ?? []) {
      if (p.assessor) named.set(p.assessor.id, p.assessor.name)
    }
    return [...named.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [projects])

  // Counts come from everything except the status tab itself, so the tabs show
  // how many projects each status holds *within the current search* rather
  // than a total that ignores what you just typed.
  const withoutStatus = useMemo(() => {
    const query = filters.search.trim().toLowerCase()

    return (projects ?? []).filter((p) => {
      if (query && !haystack(p).includes(query)) return false
      if (filters.assessor === 'unassigned' && p.assessor) return false
      if (filters.assessor !== 'all' && filters.assessor !== 'unassigned') {
        if (String(p.assessor?.id) !== filters.assessor) return false
      }
      if (filters.stage !== 'all' && p.stage !== filters.stage) return false
      if (filters.defense !== 'all') {
        const scheduled = Boolean(p.proposal_defense_at || p.final_defense_at)
        if (filters.defense === 'scheduled' ? !scheduled : scheduled) return false
      }
      return true
    })
  }, [projects, filters.search, filters.assessor, filters.stage, filters.defense])

  const counts = useMemo(() => {
    const tally = { all: withoutStatus.length }
    for (const tab of TABS) {
      if (tab.key === 'all') continue
      tally[tab.key] = withoutStatus.filter((p) => p.status === tab.key).length
    }
    return tally
  }, [withoutStatus])

  const visible = useMemo(() => {
    const rows = withoutStatus.filter((p) => filters.status === 'all' || p.status === filters.status)

    const sorters = {
      recent: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
      oldest: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
      title: (a, b) => a.title.localeCompare(b.title),
      group: (a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0),
    }

    return [...rows].sort(sorters[filters.sort] ?? sorters.recent)
  }, [withoutStatus, filters.status, filters.sort])

  // Only the filters actually doing something get a chip, so the row stays
  // empty until there is something to clear.
  const chips = [
    filters.search.trim() && { key: 'search', label: `Search: "${filters.search.trim()}"` },
    filters.status !== 'all' && {
      key: 'status',
      label: `Status: ${TABS.find((t) => t.key === filters.status)?.label}`,
    },
    filters.assessor !== 'all' && {
      key: 'assessor',
      label: `Assessor: ${
        filters.assessor === 'unassigned'
          ? 'Unassigned'
          : assessors.find(([id]) => String(id) === filters.assessor)?.[1] ?? '—'
      }`,
    },
    filters.stage !== 'all' && {
      key: 'stage',
      label: `Stage: ${STAGES.find((s) => s.key === filters.stage)?.label}`,
    },
    filters.defense !== 'all' && {
      key: 'defense',
      label: DEFENSE.find((d) => d.key === filters.defense)?.label,
    },
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      <PageHeading description="Search and filter every submitted project by group member, index number, assessor or topic.">
        All Projects
      </PageHeading>

      <Card className="p-0">
        {/* Status tabs, each carrying its own count — the count is what turns
            a tab row into a summary of the queue rather than just navigation. */}
        <div className="overflow-x-auto border-b border-border px-2">
          <div className="flex min-w-max gap-1 py-2">
            {TABS.map((tab) => {
              const active = filters.status === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => set('status')(tab.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-brand text-brand-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                      active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {counts[tab.key] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                <SearchIcon size={18} />
              </span>
              <input
                value={filters.search}
                onChange={(e) => set('search')(e.target.value)}
                placeholder="Search by topic, student name, index number or assessor"
                aria-label="Search projects"
                className="w-full rounded-lg border border-input bg-background py-2.5 pr-3 pl-10 text-[15px] font-medium text-foreground transition placeholder:font-normal placeholder:text-muted-foreground hover:border-ring/60 focus:border-brand focus:ring-[3px] focus:ring-ring/25 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:shrink-0">
              <Select value={filters.assessor} onChange={set('assessor')} label="Assessor">
                <option value="all">Any assessor</option>
                <option value="unassigned">Unassigned</option>
                {assessors.map(([id, name]) => (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                ))}
              </Select>

              <Select value={filters.stage} onChange={set('stage')} label="Stage">
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>

              <Select value={filters.defense} onChange={set('defense')} label="Defense">
                {DEFENSE.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>

              <Select value={filters.sort} onChange={set('sort')} label="Sort">
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => reset(chip.key)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pr-2 pl-3 text-xs font-semibold text-foreground transition hover:bg-accent"
                >
                  {chip.label}
                  <span className="text-muted-foreground">
                    <XIcon size={14} />
                  </span>
                </button>
              ))}
              <button
                onClick={() => setFilters(DEFAULTS)}
                className="text-xs font-semibold text-brand-ink hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      {swrError ? (
        <Card>
          <ErrorState
            title="Couldn't load projects"
            description="We couldn't reach the server. Check your connection and try again."
            onRetry={() => mutate()}
          />
        </Card>
      ) : isLoading ? (
        <Card>
          <SkeletonTable rows={6} cols={4} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderIcon}
            title={chips.length ? 'No projects match these filters' : 'No projects submitted yet'}
            description={
              chips.length
                ? 'Try a different search, or clear a filter above.'
                : 'Projects appear here once a group submits one.'
            }
          />
        </Card>
      ) : (
        <>
          <p className="px-1 text-sm font-medium text-muted-foreground">
            Showing {visible.length} of {projects.length} project
            {projects.length !== 1 ? 's' : ''}
          </p>
          <ProjectTable projects={visible} />
        </>
      )}
    </div>
  )
}

function Select({ value, onChange, label, children }) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-ring/60 focus:border-brand focus:ring-[3px] focus:ring-ring/25 focus:outline-none lg:w-auto"
    >
      {children}
    </select>
  )
}

/**
 * A table on desktop and stacked cards below it.
 *
 * A table is the right shape once you are comparing projects — the columns
 * line up so you can scan one attribute down the list — but it collapses badly
 * on a phone, where the same rows read better as cards.
 */
function ProjectTable({ projects }) {
  return (
    <>
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {/* Numbers the current sort/filter, not a database id — the
                    same project is #1 under "Recently updated" and #4 under
                    "Title (A–Z)". That's the point: it labels this specific
                    ordering so an admin can say "check number 3" and mean
                    something, rather than a stable identity for the row. */}
                <th className="px-4 py-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  #
                </th>
                {['Project', 'Group', 'Assessor', 'Status', 'Updated'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-bold tracking-wide text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project, index) => {
                const leader = project.members?.find((m) => m.is_leader) ?? project.members?.[0]
                const leaderName = leader ? memberName(leader) : 'Unassigned'

                return (
                  <tr key={project.id} className="transition hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="font-semibold text-foreground hover:text-brand-ink hover:underline"
                      >
                        {project.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {project.stage === 'final' ? 'Final Project Work' : 'Project Proposal'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={leaderName} className="h-8 w-8 text-[10px]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{leaderName}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.members?.length ?? 0} member
                            {(project.members?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {project.assessor?.name ?? (
                        <span className="text-amber-700 dark:text-amber-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(project.updated_at, { time: false, empty: '—' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-3 md:hidden">
        {projects.map((project, index) => {
          const leader = project.members?.find((m) => m.is_leader) ?? project.members?.[0]
          const leaderName = leader ? memberName(leader) : 'Unassigned'

          return (
            <Link key={project.id} to={`/admin/projects/${project.id}`} className="block">
              <Card interactive className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 font-semibold break-words text-foreground">
                    {/* Same index the desktop table's # column shows — the
                        current sort/filter's position, not the project's id. */}
                    <span className="text-muted-foreground">{index + 1}.</span> {project.title}
                  </h2>
                  <Badge status={project.status} />
                </div>
                <div className="flex items-center gap-2">
                  <Avatar name={leaderName} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{leaderName}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.members?.length ?? 0} member
                      {(project.members?.length ?? 0) !== 1 ? 's' : ''} ·{' '}
                      {project.assessor?.name ?? 'Unassigned'}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </>
  )
}
