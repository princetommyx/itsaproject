import { useState } from 'react'
import useSWR from 'swr'
import { Avatar, Card, EmptyState, ErrorState } from '../../../components/ui'
import { SkeletonList } from '../../../components/Skeleton'
import { InboxIcon } from '../../../components/icons'
import { formatDateTime } from '../../../lib/formatDate'

/**
 * Wording for each recorded action. An action with no entry still displays —
 * it falls back to the dotted key — so recording a new kind of action never
 * leaves a blank row here.
 */
const ACTION_LABELS = {
  'project.approved': 'Approved a project',
  'project.revision_requested': 'Requested a revision',
  'project.assessor_assigned': 'Assigned an assessor',
  'project.member_added': 'Added a student to a group',
  'project.member_removed': 'Removed a student from a group',
  'project.defense_scheduled': 'Set defense dates',
  'settings.updated': 'Updated system settings',
  'settings.logo_updated': 'Changed the system logo',
  'settings.logo_removed': 'Removed the system logo',
  'role.created': 'Created a role',
  'role.updated': 'Updated a role',
  'role.deleted': 'Deleted a role',
  'user.role_assigned': "Changed a user's role",
  'students.imported': 'Imported a student roster',
  'staff.created': 'Created a staff account',
}

const FILTERS = [
  { key: '', label: 'Everything' },
  { key: 'project', label: 'Projects' },
  { key: 'settings', label: 'Settings' },
  { key: 'role', label: 'Roles' },
  { key: 'user', label: 'Users' },
]

/**
 * Turn the recorded detail into a readable sentence. Deliberately narrow —
 * each action stores what is worth knowing about that action, so this reads
 * the few keys that carry meaning rather than dumping the whole object.
 */
function describe(entry) {
  const meta = entry.meta ?? {}

  if (meta.keys?.length) return `Changed: ${meta.keys.join(', ')}`
  if (meta.title && meta.version) return `${meta.title} (${meta.version})`
  if (meta.added?.length || meta.removed?.length) {
    return [
      meta.added?.length ? `+${meta.added.length} permission(s)` : null,
      meta.removed?.length ? `−${meta.removed.length} permission(s)` : null,
    ]
      .filter(Boolean)
      .join(', ')
  }
  if (meta.user && meta.role) return `${meta.user} → ${meta.role}`

  return [meta.name, meta.student, meta.assessor, meta.title].filter(Boolean).join(' · ')
}

export default function AuditLogSettings() {
  const [filter, setFilter] = useState('')
  const { data, error: swrError, mutate } = useSWR(
    `/admin/audit-logs${filter ? `?action=${filter}` : ''}`
  )
  const entries = data?.data ?? []
  const isLoading = !data && !swrError

  return (
    <Card>
      <h2 className="text-lg font-bold text-foreground">Audit Logs</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        Who changed what, and when. Entries are kept even after the account that made them is
        removed.
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              filter === f.key
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {swrError ? (
          <ErrorState
            title="Couldn't load the audit log"
            description="We couldn't reach the server. Check your connection and try again."
            onRetry={() => mutate()}
          />
        ) : isLoading ? (
          <SkeletonList rows={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="Nothing recorded yet"
            description="Administrative actions will appear here as they happen."
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const detail = describe(entry)

              return (
                <li key={entry.id} className="flex items-start gap-3 py-3.5">
                  <Avatar
                    name={entry.actor_name ?? '?'}
                    className="mt-0.5 h-8 w-8 shrink-0 text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    {detail && (
                      <p className="mt-0.5 text-sm font-medium break-words text-muted-foreground">{detail}</p>
                    )}
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {entry.actor_name ?? 'A removed account'}
                      {entry.actor_role && ` (${entry.actor_role})`} ·{' '}
                      {formatDateTime(entry.created_at, { empty: 'unknown time' })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
