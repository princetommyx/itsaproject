import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'
import { Avatar, Card, Input, StatCard } from '../../../components/ui'
import { SkeletonStatCards } from '../../../components/Skeleton'
import ProfileShell from '../../../components/ProfileShell'

export default function AdminProfile() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    client.get('/admin/dashboard').then((res) => setStats(res.data))
  }, [])

  return (
    <ProfileShell homePath="/admin" homeLabel="Dashboard">
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
            These details are managed by the university. Contact another administrator to update them.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Input label="Full Name" value={user?.name ?? ''} disabled />
            <Input label="Email Address" value={user?.email ?? ''} disabled />
            <Input label="Role" value="Administrator" disabled />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">System Overview</h2>
          {stats === null ? (
            <SkeletonStatCards count={3} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Students" value={stats.total_students} variant="blue" />
              <StatCard label="Total Assessors" value={stats.total_assessors} variant="violet" />
              <StatCard label="Projects Submitted" value={stats.total_submitted} variant="gold" />
            </div>
          )}
        </Card>
      </div>
    </ProfileShell>
  )
}
