import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { useSettings } from '../../../context/SettingsContext'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeading } from '../../../components/ui'
import { SkeletonCard, SkeletonStatCards } from '../../../components/Skeleton'
import StatusBreakdownChart from '../../../components/StatusBreakdownChart'
import { CheckCircleIcon } from '../../../components/icons'
import { memberName } from '../../../lib/memberName'
import { relativeTime } from '../../../lib/formatDate'
import { cn } from '../../../lib/cn'

// Static, not `bg-chart-${variant}`: Tailwind scans source text, so a class
// assembled at runtime is never generated and the bar renders with no colour.
const PROGRESS_STYLES = {
  awaiting: { fill: 'bg-chart-awaiting', track: 'bg-chart-awaiting/20' },
  review: { fill: 'bg-chart-review', track: 'bg-chart-review/20' },
  approved: { fill: 'bg-chart-approved', track: 'bg-chart-approved/20' },
  refine: { fill: 'bg-chart-refine', track: 'bg-chart-refine/20' },
}

const STATUS_ROWS = [
  { key: 'unassigned', label: 'Awaiting Assignment', variant: 'awaiting' },
  { key: 'pending', label: 'Under Review', variant: 'review' },
  { key: 'approved', label: 'Approved', variant: 'approved' },
  { key: 'refine', label: 'Needs Refinement', variant: 'refine' },
]

export default function Overview() {
  const toast = useToast()
  const { settings } = useSettings()
  const { data: stats, error: swrError, mutate } = useSWR('/admin/dashboard')
  const isLoading = !stats && !swrError
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await client.get('/admin/projects/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'upsa-project-data.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Project data exported', {
        description: 'Two sheets: one per group, one per student — with topic, supervisor, and defense dates.',
      })
    } catch {
      toast.error('Could not export project data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const heading = (
    <PageHeading
      actions={
        <Button onClick={handleExport} disabled={exporting} loading={exporting}>
          {exporting ? 'Preparing…' : 'Export Data'}
        </Button>
      }
    >
      Dashboard
    </PageHeading>
  )

  if (swrError) {
    return (
      <div className="space-y-5">
        {heading}
        <Card>
          <ErrorState
            title="Couldn't load the dashboard"
            description="We couldn't reach the server. Check your connection and try again."
            onRetry={() => mutate()}
          />
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        {heading}
        <SkeletonCard lines={1} />
        <SkeletonStatCards count={6} />
        <SkeletonCard lines={3} />
      </div>
    )
  }

  // Every second line here is a real count. The reference design carried trend
  // percentages, but nothing in this system records history, so a made-up
  // "+30%" would be worse than no second line.
  const TILES = [
    {
      label: 'Total Students',
      value: stats.total_students,
      note: stats.students_without_group > 0
        ? `${stats.students_without_group} not in a group`
        : 'All in a group',
      to: '/admin/students',
    },
    {
      label: 'Assessors',
      value: stats.total_assessors,
      note: `${stats.assessors_engaged} with assigned work`,
      to: '/admin/staff',
    },
    {
      label: 'Projects Submitted',
      value: stats.total_submitted,
      note: `${stats.submitted_this_week} active this week`,
      to: '/admin/projects',
    },
    {
      label: 'Awaiting Assignment',
      value: stats.unassigned,
      note: stats.oldest_unassigned_days === null
        ? 'Queue is clear'
        : `Oldest waiting ${stats.oldest_unassigned_days} day${stats.oldest_unassigned_days === 1 ? '' : 's'}`,
      to: '/admin/assignments',
      urgent: stats.unassigned > 0,
    },
    {
      label: 'Still Drafting',
      value: stats.draft,
      note: 'Not yet submitted',
    },
    {
      label: 'Defenses Scheduled',
      value: stats.defense_scheduled,
      note: `of ${stats.total_submitted} submitted`,
    },
  ]

  // Progress through the pipeline, each stage as a share of what was
  // submitted. Ratios of real counts — not targets, which nobody has set.
  const submitted = Math.max(stats.total_submitted, 1)
  const PROGRESS = [
    { label: 'Assigned an assessor', value: stats.total_submitted - stats.unassigned, variant: 'review' },
    { label: 'Approved', value: stats.approved, variant: 'approved' },
    { label: 'Defense scheduled', value: stats.defense_scheduled, variant: 'awaiting' },
  ]

  return (
    <div className="space-y-5">
      {heading}

      {/* The institution and the period these numbers describe. Without it the
          dashboard is a set of counts with no stated scope. */}
      <Card className="p-0">
        <dl className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {[
            ['Institution', settings.short_name || 'UPSA'],
            ['Department', settings.department],
            ['Academic Year', settings.academic_year],
            ['Session', settings.current_session],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1 truncate text-[15px] font-semibold text-foreground" title={value}>
                {value || '—'}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-bold text-foreground">Summary</h2>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-3">
              {TILES.map((tile) => {
                const body = (
                  <>
                    <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      {tile.label}
                    </p>
                    <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-foreground">
                      {tile.value}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-xs font-medium',
                        tile.urgent ? 'text-chart-refine' : 'text-muted-foreground'
                      )}
                    >
                      {tile.note}
                    </p>
                  </>
                )

                return tile.to ? (
                  <Link
                    key={tile.label}
                    to={tile.to}
                    className="bg-card p-4 transition hover:bg-muted"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={tile.label} className="bg-card p-4">
                    {body}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-bold text-foreground">Projects by Status</h2>
            <StatusBreakdownChart
              rows={STATUS_ROWS.map((r) => ({ ...r, value: stats[r.key] }))}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-bold text-foreground">Pipeline Progress</h2>
            <p className="mt-0.5 mb-4 text-sm font-medium text-muted-foreground">
              How far the {stats.total_submitted} submitted project
              {stats.total_submitted === 1 ? '' : 's'} have got.
            </p>

            <div className="space-y-4">
              {PROGRESS.map((row) => {
                const pct = Math.round((row.value / submitted) * 100)
                const style = PROGRESS_STYLES[row.variant]

                return (
                  <div key={row.label} title={`${row.label}: ${row.value} of ${stats.total_submitted} (${pct}%)`}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{row.label}</span>
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">
                        {row.value} / {stats.total_submitted}
                      </span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${style.track}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${style.fill}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">Needs Attention</h2>
              <Link
                to="/admin/assignments"
                className="text-xs font-semibold text-brand-ink hover:underline"
              >
                View all
              </Link>
            </div>

            {(stats.needs_attention?.length ?? 0) === 0 ? (
              <EmptyState
                icon={CheckCircleIcon}
                title="Nothing waiting"
                description="Every submitted project has been assigned and reviewed."
              />
            ) : (
              <ul className="space-y-3">
                {stats.needs_attention.map((project) => {
                  const leader = project.members?.find((m) => m.is_leader) ?? project.members?.[0]

                  return (
                    <li key={project.id}>
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-muted"
                      >
                        <Avatar
                          name={leader ? memberName(leader) : project.title}
                          className="mt-0.5 h-8 w-8 text-[10px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {project.title}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {project.assessor?.name ?? 'Unassigned'} ·{' '}
                            {relativeTime(project.updated_at)}
                          </p>
                          <div className="mt-1.5">
                            <Badge status={project.status} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
