import { Link } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Badge, Card, Input } from '../../components/ui'
import { SkeletonCard } from '../../components/Skeleton'
import ProfileShell from '../../components/ProfileShell'
import StatusTimeline from '../../components/StatusTimeline'

export default function StudentProfile() {
  const { user } = useAuth()
  const { data: projectData, error: swrError } = useSWR('/student/project')
  
  const project = projectData?.project
  const isLoading = !projectData && !swrError

  return (
    <ProfileShell homePath="/student" homeLabel="My Project">
      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
              <p className="text-sm text-slate-500">{user?.university_id}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            These details are managed by the university. Contact your administrator to update them.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Input label="Full Name" value={user?.name ?? ''} disabled />
            <Input label="Index Number" value={user?.university_id ?? ''} disabled />
            <Input label="Email Address" value={user?.student_email ?? ''} disabled />
            <Input
              label="Date of Birth"
              value={
                user?.dob
                  ? new Date(user.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : ''
              }
              disabled
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Project Information</h2>
          {isLoading ? (
            <SkeletonCard lines={2} />
          ) : project ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Input label="Project Title" value={project.title} disabled />
                <Input label="Supervisor" value={project.assessor?.name ?? 'Not yet assigned'} disabled />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Project Progress</p>
                <StatusTimeline status={project.status} />
              </div>
              <div>
                <Badge status={project.status} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              You haven't started a project yet.{' '}
              <Link to="/student" className="font-medium text-upsa-blue hover:underline">
                Get started
              </Link>
              .
            </p>
          )}
        </Card>
      </div>
    </ProfileShell>
  )
}
