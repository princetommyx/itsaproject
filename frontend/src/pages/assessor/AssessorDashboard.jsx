import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../api/client'
import { Badge, Card, EmptyState, PageHeading, StatCard, stagger } from '../../components/ui'
import { SkeletonCardGrid, SkeletonStatCards } from '../../components/Skeleton'
import { ClipboardIcon } from '../../components/icons'

export default function AssessorDashboard() {
  const { data: projects, error: swrError } = useSWR('/assessor/projects')
  const isLoading = !projects && !swrError

  const counts = projects && {
    pending: projects.filter((p) => p.status === 'pending').length,
    approved: projects.filter((p) => p.status === 'approved').length,
    refine: projects.filter((p) => p.status === 'refine').length,
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Projects assigned to you for review.">Assigned Projects</PageHeading>

      {isLoading ? (
        <>
          <SkeletonStatCards count={4} />
          <SkeletonCardGrid />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Assigned" value={projects.length} variant="blue" className="animate-fade-up" style={stagger(0)} />
            <StatCard label="Pending Review" value={counts.pending} variant="gold" className="animate-fade-up" style={stagger(1)} />
            <StatCard label="Approved" value={counts.approved} variant="violet" className="animate-fade-up" style={stagger(2)} />
            <StatCard label="Needs Refinement" value={counts.refine} variant="pink" className="animate-fade-up" style={stagger(3)} />
          </div>

          {projects.length === 0 ? (
            <Card>
              <EmptyState icon={ClipboardIcon} title="No projects have been assigned to you yet" />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project, i) => (
                <Link
                  key={project.id}
                  to={`/assessor/projects/${project.id}`}
                  className="animate-fade-up"
                  style={stagger(i)}
                >
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
        </>
      )}
    </div>
  )
}
