import { useState } from 'react'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Alert, Button, Card, EmptyState, ErrorState, PageHeading } from '../../../components/ui'
import { ClipboardIcon } from '../../../components/icons'
import { Skeleton } from '../../../components/Skeleton'
import { memberName } from '../../../lib/memberName'

function AssignmentsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-6 shadow-sm shadow-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Skeleton className="h-9 w-full sm:w-40" />
              <Skeleton className="h-9 w-20 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Assignments() {
  const toast = useToast()
  
  const { data: projects, error: projectsError, mutate: mutateProjects } = useSWR('/admin/projects/unassigned')
  const { data: assessors, error: assessorsError } = useSWR('/admin/assessors')
  const isLoading = !projects && !projectsError

  const [selection, setSelection] = useState({})
  const [error, setError] = useState('')
  const [assigningId, setAssigningId] = useState(null)

  async function assign(projectId) {
    setError('')
    const assessorId = selection[projectId]
    if (!assessorId) {
      setError('Select an assessor first.')
      return
    }
    setAssigningId(projectId)
    try {
      await client.post(`/admin/projects/${projectId}/assign`, { assessor_id: assessorId })
      const assessorName = (assessors || []).find((a) => String(a.id) === String(assessorId))?.name
      toast.success('Project assigned successfully', {
        description: assessorName ? `${assessorName} has been assigned to review this project.` : undefined,
      })
      mutateProjects()
    } catch (err) {
      const message = err.response?.data?.message
      setError(message || 'Could not assign assessor.')
      toast.error('Unable to assign assessor', { description: message || 'Something went wrong. Please try again.' })
    } finally {
      setAssigningId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading>Assign Assessors</PageHeading>
        <AssignmentsSkeleton />
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className="space-y-6">
        <PageHeading>Assign Assessors</PageHeading>
        <Card>
          <ErrorState
            title="Couldn't load projects awaiting assignment"
            description="We couldn't reach the server. Check your connection and try again."
            onRetry={() => mutateProjects()}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading>Assign Assessors</PageHeading>
      {error && <Alert>{error}</Alert>}
      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardIcon}
            title="No projects awaiting assignment"
            description="Once students submit a project, it'll show up here for you to assign an assessor."
          />
        </Card>
      ) : (
        projects.map((project) => (
          <Card key={project.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{project.title}</h3>
                <p className="text-sm text-muted-foreground break-words">
                  {project.members.map(memberName).join(', ')}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-[15px] font-medium text-foreground transition duration-150 hover:border-ring/60 focus:border-brand focus:ring-4 focus:ring-ring/25 focus:outline-none sm:w-auto"
                  value={selection[project.id] || ''}
                  onChange={(e) => setSelection({ ...selection, [project.id]: e.target.value })}
                >
                  <option value="">Select assessor...</option>
                  {(assessors || []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => assign(project.id)}
                  disabled={assigningId === project.id}
                  loading={assigningId === project.id}
                >
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
