import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Card, PageHeading } from '../../components/ui'
import { SkeletonCard } from '../../components/Skeleton'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function StudentProfile() {
  const { user } = useAuth()
  const [project, setProject] = useState(undefined)

  useEffect(() => {
    client.get('/student/project').then((res) => setProject(res.data.project))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeading description="Your account details on file.">My Profile</PageHeading>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} className="h-14 w-14 text-base" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.university_id}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Field label="Index Number" value={user?.university_id} />
          <Field label="Email" value={user?.student_email} />
          <Field
            label="Date of Birth"
            value={user?.dob && new Date(user.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Project</h2>
        {project === undefined ? (
          <SkeletonCard lines={2} />
        ) : project ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Field label="Project Title" value={project.title} />
            <Field label="Supervisor" value={project.assessor?.name} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">You haven't started a project yet.</p>
        )}
      </Card>
    </div>
  )
}
