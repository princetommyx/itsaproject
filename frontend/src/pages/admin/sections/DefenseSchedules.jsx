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

  function exportCSV() {
    const headers = ['Project Title', 'Group Members', 'Assessor', 'Proposal Defense', 'Project Defense']
    const rows = approvedProjects.map(p => {
      const members = p.members.map(m => memberName(m) + (m.university_id ? ` (${m.university_id})` : '')).join('; ')
      const assessor = p.assessor?.name || 'Unassigned'
      const proposal = p.proposal_defense_at ? formatDateTime(p.proposal_defense_at) : 'Not scheduled'
      const final = p.final_defense_at ? formatDateTime(p.final_defense_at) : 'Not scheduled'
      
      // Escape quotes and wrap in quotes for CSV
      return [
        `"${p.title.replace(/"/g, '""')}"`,
        `"${members.replace(/"/g, '""')}"`,
        `"${assessor.replace(/"/g, '""')}"`,
        `"${proposal}"`,
        `"${final}"`
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `defense_schedules_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      <PageHeading
        description="Manage defense dates for all approved projects. Saving dates will automatically notify the students."
        actions={
          <Button onClick={exportCSV} disabled={approvedProjects.length === 0}>
            Export to CSV
          </Button>
        }
      >
        Defense Schedules
      </PageHeading>

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
