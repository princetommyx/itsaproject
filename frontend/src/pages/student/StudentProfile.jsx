import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Badge, ErrorState, Input } from '../../components/ui'
import { FieldGrid, IdentityHeader, SectionCard } from '../../components/SectionLayout'
import { SkeletonCard } from '../../components/Skeleton'
import StatusTimeline from '../../components/StatusTimeline'
import ProfileShell from '../../components/ProfileShell'
import { FolderIcon } from '../../components/icons'
import { formatDateTime } from '../../lib/formatDate'

export default function StudentProfile() {
  const { user } = useAuth()
  const { data: projectData, error: swrError, mutate } = useSWR('/student/project')

  const project = projectData?.project
  const isLoading = !projectData && !swrError

  const projectSection = (
    <SectionCard title="Project Information">
      {isLoading ? (
        <SkeletonCard lines={2} />
      ) : swrError ? (
        <ErrorState
          title="Couldn't load your project"
          description="Your details are still accurate."
          onRetry={() => mutate()}
        />
      ) : project ? (
        <div className="space-y-5">
          <FieldGrid>
            <Input label="Project Title" value={project.title} disabled />
            <Input label="Supervisor" value={project.assessor?.name ?? 'Not yet assigned'} disabled />
          </FieldGrid>
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Project Progress</p>
            <StatusTimeline status={project.status} />
          </div>
          <Badge status={project.status} />
        </div>
      ) : (
        <p className="text-sm font-medium text-muted-foreground">
          You haven&apos;t started a project yet.{' '}
          <Link to="/student" className="font-semibold text-brand-ink hover:underline">
            Create one
          </Link>
          .
        </p>
      )}
    </SectionCard>
  )

  return (
    <ProfileShell
      subtitle="Student"
      extraSections={[{ key: 'project', label: 'My Project', icon: FolderIcon, content: projectSection }]}
    >
      <SectionCard
        title="Personal Details"
        description="Managed by the university. Contact your administrator to change them."
      >
        <div className="mb-5 lg:hidden">
          <IdentityHeader
            avatar={<Avatar name={user?.name} className="h-14 w-14 text-base" />}
            name={user?.name}
            subtitle={user?.university_id}
          />
        </div>

        <FieldGrid>
          <Input label="Full Name" value={user?.name ?? ''} disabled />
          <Input label="Index Number" value={user?.university_id ?? ''} disabled />
          <Input label="Email Address" value={user?.student_email ?? ''} disabled />
          <Input
            label="Date of Birth"
            value={user?.dob ? formatDateTime(user.dob, { time: false, empty: '' }) : ''}
            disabled
          />
        </FieldGrid>
      </SectionCard>
    </ProfileShell>
  )
}
