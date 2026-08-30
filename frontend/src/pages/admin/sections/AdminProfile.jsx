import useSWR from 'swr'
import { useAuth } from '../../../context/AuthContext'
import { Avatar, ErrorState, Input, StatCard } from '../../../components/ui'
import { FieldGrid, IdentityHeader, SectionCard } from '../../../components/SectionLayout'
import { SkeletonStatCards } from '../../../components/Skeleton'
import ProfileShell from '../../../components/ProfileShell'
import { ChartIcon } from '../../../components/icons'

export default function AdminProfile() {
  const { user } = useAuth()
  const { data: stats, error: swrError, mutate } = useSWR('/admin/dashboard')
  const isLoading = !stats && !swrError

  const overview = (
    <SectionCard
      title="System Overview"
      description="Totals across the whole platform, as of now."
    >
      {isLoading ? (
        <SkeletonStatCards count={3} />
      ) : swrError ? (
        <ErrorState
          title="Couldn't load the system overview"
          description="Your profile details are still accurate."
          onRetry={() => mutate()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Students" value={stats.total_students} variant="blue" />
          <StatCard label="Total Assessors" value={stats.total_assessors} variant="violet" />
          <StatCard label="Projects Submitted" value={stats.total_submitted} variant="gold" />
        </div>
      )}
    </SectionCard>
  )

  return (
    <ProfileShell
      homePath="/admin"
      homeLabel="Dashboard"
      subtitle="Administrator"
      extraSections={[{ key: 'overview', label: 'System Overview', icon: ChartIcon, content: overview }]}
    >
      <SectionCard
        title="Personal Details"
        description="Managed by the university. Contact another administrator to change them."
      >
        <div className="mb-5 lg:hidden">
          <IdentityHeader
            avatar={<Avatar name={user?.name} className="h-14 w-14 text-base" />}
            name={user?.name}
            subtitle={user?.role_name || 'Administrator'}
          />
        </div>

        <FieldGrid>
          <Input label="Full Name" value={user?.name ?? ''} disabled />
          <Input label="Email Address" value={user?.email ?? ''} disabled />
          <Input label="Role" value={user?.role_name || 'Administrator'} disabled />
        </FieldGrid>
      </SectionCard>
    </ProfileShell>
  )
}
