import { useState } from 'react'
import useSWR from 'swr'
import { Card, ErrorState, PageHeading } from '../../../components/ui'
import { SkeletonCard } from '../../../components/Skeleton'
import GeneralSettings from './GeneralSettings'
import AppearanceSettings from './AppearanceSettings'
import SubmissionSettings from './SubmissionSettings'
import NotificationSettings from './NotificationSettings'
import RolesSettings from './RolesSettings'
import AuditLogSettings from './AuditLogSettings'

const SECTIONS = [
  { key: 'general', label: 'General', Component: GeneralSettings },
  { key: 'appearance', label: 'Appearance', Component: AppearanceSettings },
  { key: 'submissions', label: 'Submission Rules', Component: SubmissionSettings },
  { key: 'roles', label: 'Roles & Permissions', Component: RolesSettings },
  { key: 'notifications', label: 'Notifications', Component: NotificationSettings },
  { key: 'audit', label: 'Audit Logs', Component: AuditLogSettings },
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
    <div className="space-y-6">
      <PageHeading description="Configure the system without needing a developer.">
        Settings
      </PageHeading>

      <div className="relative -mx-4 sm:mx-0">
        <div className="overflow-x-auto px-4 pb-3 sm:px-0 sm:pb-0">
          <div className="flex gap-2.5 whitespace-nowrap">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                  section === s.key
                    ? 'bg-brand text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-muted to-transparent sm:hidden" />
      </div>

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
    </div>
  )
}
