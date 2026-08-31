import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { Button, Card, ErrorState, PageHeading } from '../../../components/ui'
import { SkeletonCard } from '../../../components/Skeleton'
import DefenseScheduleCard from '../../../components/DefenseScheduleCard'
import { formatDateTime } from '../../../lib/formatDate'
import { memberName } from '../../../lib/memberName'

export default function DefenseSchedules() {
  const { data, error, mutate } = useSWR('/admin/projects')
  const isLoading = !data && !error

  // /admin/projects responds with a bare array. Reading data.projects gave
  // undefined every time, so this page showed "no approved projects" however
  // many there were.
  const projects = Array.isArray(data) ? data : (data?.projects ?? [])
  const approvedProjects = projects.filter(p => p.status === 'approved')

  // The two defences happen months apart — a proposal is defended, then the
  // project — so the sheet handed to students is almost never both at once.
  // Each stage exports on its own; "Both" stays as a working overview.
  const EXPORTS = {
    proposal: { dateKey: 'proposal_defense_at', column: 'Proposal Defense', file: 'proposal_defense_schedule' },
    project: { dateKey: 'final_defense_at', column: 'Project Defense', file: 'project_defense_schedule' },
  }

  const scheduled = {
    proposal: approvedProjects.filter((p) => p.proposal_defense_at),
    project: approvedProjects.filter((p) => p.final_defense_at),
  }

  // One place that knows CSV: quote every field and double any quote inside
  // it. Quoting also covers commas and newlines in a project title, which a
  // hand-joined row would otherwise split into extra columns.
  function toCsv(headers, rows) {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')
  }

  function download(csv, filename) {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const groupOf = (p) =>
    p.members.map((m) => memberName(m) + (m.university_id ? ` (${m.university_id})` : '')).join('; ')

  function exportStage(key) {
    const { dateKey, column, file } = EXPORTS[key]

    // Only groups that actually have a date for this stage. The sheet goes to
    // students, and a row reading "Not scheduled" tells them nothing except
    // that the timetable is unfinished. Ordered by when they sit it, which is
    // the order anyone reads a schedule in.
    const rows = scheduled[key]
      .slice()
      .sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]))
      .map((p) => [p.title, groupOf(p), p.assessor?.name || 'Unassigned', formatDateTime(p[dateKey])])

    download(toCsv(['Project Title', 'Group Members', 'Assessor', column], rows), file)
  }

  function exportBoth() {
    const rows = approvedProjects.map((p) => [
      p.title,
      groupOf(p),
      p.assessor?.name || 'Unassigned',
      p.proposal_defense_at ? formatDateTime(p.proposal_defense_at) : 'Not scheduled',
      p.final_defense_at ? formatDateTime(p.final_defense_at) : 'Not scheduled',
    ])

    download(
      toCsv(['Project Title', 'Group Members', 'Assessor', 'Proposal Defense', 'Project Defense'], rows),
      'defense_schedules'
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading>Defense Schedules</PageHeading>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeading>Defense Schedules</PageHeading>
        <Card>
          <ErrorState
            title="Couldn't load projects"
            description="We couldn't retrieve the projects. Please try again."
            onRetry={() => mutate()}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title, description and actions all go through PageHeading, the same
          as every other page: it publishes the title to the app bar and lays
          the action out beside the description. Hand-rolling the row left the
          button floating on its own above the text.

          The export is a primary button, matching the dashboard's own Export
          Data. As `secondary` it had no visible fill — that token is
          near-white — so it read as a stray line of text rather than a
          control. */}
      <PageHeading description="Saving a date notifies the group. Each stage exports separately, listing only the groups scheduled for it.">
        Defense Schedules
      </PageHeading>

      {/* Their own wrapping row rather than PageHeading's actions slot: that
          slot is shrink-0, sized for a single button, so three of them pushed
          the whole page into horizontal scroll on a phone. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => exportStage('proposal')}
          disabled={scheduled.proposal.length === 0}
          title={
            scheduled.proposal.length === 0
              ? 'No proposal defense has been scheduled yet.'
              : `Export the ${scheduled.proposal.length} scheduled proposal defense(s).`
          }
        >
          Proposal defense ({scheduled.proposal.length})
        </Button>
        <Button
          variant="outline"
          onClick={() => exportStage('project')}
          disabled={scheduled.project.length === 0}
          title={
            scheduled.project.length === 0
              ? 'No project defense has been scheduled yet.'
              : `Export the ${scheduled.project.length} scheduled project defense(s).`
          }
        >
          Project defense ({scheduled.project.length})
        </Button>
        <Button onClick={exportBoth} disabled={approvedProjects.length === 0}>
          Both ({approvedProjects.length})
        </Button>
      </div>

      {approvedProjects.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No approved projects ready for defense scheduling.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {approvedProjects.map(project => (
            <Card key={project.id}>
              <div className="mb-4 border-b border-border pb-4">
                <Link to={`/admin/projects/${project.id}`} className="text-lg font-semibold text-brand-ink hover:underline">
                  {project.title}
                </Link>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Group:</span> {project.members.map(m => memberName(m)).join(', ')}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Assessor:</span> {project.assessor?.name || 'Unassigned'}
                </div>
              </div>
              
              <DefenseScheduleCard 
                project={project} 
                onSaved={(updatedProject) => {
                  // Written back in the shape the endpoint actually returns.
                  // Spreading an array into an object literal turns it into
                  // {0: ..., 1: ...}, which would corrupt the cache the first
                  // time anyone saved a date.
                  mutate(
                    projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
                    { revalidate: false }
                  )
                }} 
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
