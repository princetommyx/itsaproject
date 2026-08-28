import { useAuth } from '../../../context/AuthContext'
import { Avatar, Card, PageHeading } from '../../../components/ui'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function AdminProfile() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeading description="Your account details on file.">My Profile</PageHeading>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} className="h-14 w-14 text-base" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Field label="Name" value={user?.name} />
          <Field label="Email" value={user?.email} />
          <Field label="Role" value="Administrator" />
        </div>
      </Card>
    </div>
  )
}
