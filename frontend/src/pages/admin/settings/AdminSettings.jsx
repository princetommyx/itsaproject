import { useState } from 'react'
import useSWR from 'swr'
import { Card, ErrorState, PageHeading } from '../../../components/ui'
import SectionLayout from '../../../components/SectionLayout'
import { SkeletonCard } from '../../../components/Skeleton'
import {
  BellIcon,
  BuildingIcon,
  FileIcon,
  LogIcon,
  PaletteIcon,
  UsersIcon,
} from '../../../components/icons'
import GeneralSettings from './GeneralSettings'
import AppearanceSettings from './AppearanceSettings'
import SubmissionSettings from './SubmissionSettings'
import NotificationSettings from './NotificationSettings'
import RolesSettings from './RolesSettings'
import AuditLogSettings from './AuditLogSettings'

const SECTIONS = [
  { key: 'general', label: 'General', icon: BuildingIcon, Component: GeneralSettings },
  { key: 'appearance', label: 'Appearance', icon: PaletteIcon, Component: AppearanceSettings },
  { key: 'submissions', label: 'Submissions', icon: FileIcon, Component: SubmissionSettings },
  { key: 'roles', label: 'Roles & Access', icon: UsersIcon, Component: RolesSettings },
  { key: 'notifications', label: 'Notifications', icon: BellIcon, Component: NotificationSettings },
  { key: 'audit', label: 'Audit Logs', icon: LogIcon, Component: AuditLogSettings },
]

/**
 * Everything an administrator can change without a developer.
 *
 * Roles and audit logs read their own endpoints rather than the settings
 * store — they aren't key/value configuration — but they live here because
 * this is where an administrator comes looking for them.
 */
export default function AdminSettings() {
  const [section, setSection] = useState('general')
  const { data, error: swrError, mutate } = useSWR('/admin/settings')
  const isLoading = !data && !swrError

  const active = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]
  const { Component } = active
  // Roles and audit logs load their own data, so they shouldn't wait behind
  // the settings request or disappear when it fails.
  const selfContained = section === 'roles' || section === 'audit'

  return (
    <div className="space-y-5">
      <PageHeading description="Configure the system without needing a developer.">
        Settings
      </PageHeading>

      <SectionLayout sections={SECTIONS} active={section} onSelect={setSection}>
        {selfContained ? (
          <Component />
        ) : isLoading ? (
          <SkeletonCard lines={5} />
        ) : swrError ? (
          <Card>
            <ErrorState
              title="Couldn't load settings"
              description="We couldn't reach the server. Check your connection and try again."
              onRetry={() => mutate()}
            />
          </Card>
        ) : (
          <Component settings={data.settings} onSaved={(next) => mutate(next, { revalidate: false })} />
        )}
      </SectionLayout>
    </div>
  )
}
