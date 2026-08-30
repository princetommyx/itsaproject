import useSWR from 'swr'
import { useAuth } from '../../context/AuthContext'
import { Avatar, ErrorState, Input, StatCard } from '../../components/ui'
import { FieldGrid, IdentityHeader, SectionCard } from '../../components/SectionLayout'
import { SkeletonStatCards } from '../../components/Skeleton'
import ProfileShell from '../../components/ProfileShell'
import { ClipboardIcon } from '../../components/icons'

export default function AssessorProfile() {
  const { user } = useAuth()
  const { data: projects, error: swrError, mutate } = useSWR('/assessor/projects')
  const isLoading = !projects && !swrError

  const studentCount = projects
    ? new Set(projects.flatMap((p) => p.members.map((m) => m.student_id ?? m.university_id))).size
    : 0
  const pendingCount = projects?.filter((p) => p.status === 'pending').length ?? 0

  const assignedWork = (
    <SectionCard title="Assigned Work" description="What is currently on your desk.">
      {isLoading ? (
        <SkeletonStatCards count={3} />
      ) : swrError ? (
        <ErrorState
          title="Couldn't load your assigned work"
          description="Your profile details are still accurate."
          onRetry={() => mutate()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Assigned Projects" value={projects.length} variant="blue" />
          <StatCard label="Assigned Students" value={studentCount} variant="violet" />
          <StatCard label="Pending Review" value={pendingCount} variant="gold" />
        </div>
      )}
    </SectionCard>
  )

  return (
    <ProfileShell
      homePath="/assessor"
      homeLabel="Assigned Projects"
      subtitle="Assessor"
      extraSections={[
        { key: 'work', label: 'Assigned Work', icon: ClipboardIcon, content: assignedWork },
      ]}
    >
      <SectionCard
        title="Personal Details"
        description="Managed by the university. Contact an administrator to change them."
      >
        <div className="mb-5 lg:hidden">
          <IdentityHeader
            avatar={<Avatar name={user?.name} className="h-14 w-14 text-base" />}
            name={user?.name}
            subtitle={user?.role_name || 'Assessor'}
          />
        </div>

        <FieldGrid>
          <Input label="Full Name" value={user?.name ?? ''} disabled />
          <Input label="Email Address" value={user?.email ?? ''} disabled />
          <Input label="Role" value={user?.role_name || 'Assessor'} disabled />
        </FieldGrid>
      </SectionCard>
    </ProfileShell>
  )
}
