import { useState } from 'react'
import useSWR from 'swr'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Card, Input, StatCard } from '../../components/ui'
import { SkeletonStatCards } from '../../components/Skeleton'
import ProfileShell from '../../components/ProfileShell'

export default function AssessorProfile() {
  const { user } = useAuth()
  const { data: projects, error: swrError } = useSWR('/assessor/projects')
  const isLoading = !projects && !swrError

  const studentCount = projects
    ? new Set(projects.flatMap((p) => p.members.map((m) => m.student_id ?? m.university_id))).size
    : 0
  const pendingCount = projects?.filter((p) => p.status === 'pending').length ?? 0

  return (
    <ProfileShell homePath="/assessor" homeLabel="Assigned Projects">
      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
              <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            These details are managed by the university. Contact your administrator to update them.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Input label="Full Name" value={user?.name ?? ''} disabled />
            <Input label="Email Address" value={user?.email ?? ''} disabled />
            <Input label="Role" value="Assessor" disabled />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Assigned Work</h2>
          {isLoading ? (
            <SkeletonStatCards count={3} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Assigned Projects" value={projects.length} variant="blue" />
              <StatCard label="Assigned Students" value={studentCount} variant="violet" />
              <StatCard label="Pending Review" value={pendingCount} variant="gold" />
            </div>
          )}
        </Card>
      </div>
    </ProfileShell>
  )
}
