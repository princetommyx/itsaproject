import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { Badge, Card, EmptyState, PageHeading } from '../../components/ui'
import { SkeletonCardGrid } from '../../components/Skeleton'
import { ClipboardIcon } from '../../components/icons'

export default function AssessorDashboard() {
  const [projects, setProjects] = useState(null)

  useEffect(() => {
    client.get('/assessor/projects').then((res) => setProjects(res.data))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeading description="Projects assigned to you for review.">Assigned Projects</PageHeading>

      {projects === null ? (
        <SkeletonCardGrid />
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardIcon} title="No projects have been assigned to you yet" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} to={`/assessor/projects/${project.id}`}>
              <Card interactive className="h-full">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words font-semibold text-slate-800">{project.title}</h2>
                  <Badge status={project.status} />
                </div>
                <p className="line-clamp-3 text-sm text-slate-500">{project.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {project.members.map((m) => m.student?.name ?? m.university_id).join(', ')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
