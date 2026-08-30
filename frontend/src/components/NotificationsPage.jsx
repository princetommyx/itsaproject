import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import client from '../api/client'
import { Button, Card, EmptyState, PageHeading, stagger } from './ui'
import { SkeletonList } from './Skeleton'
import { InboxIcon } from './icons'
import { describeNotification } from '../constants/notifications'

const ICON_VARIANT_STYLES = {
  blue: 'bg-blue-500/10 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  pink: 'bg-pink-50 text-pink-600',
  gold: 'bg-amber-500/10 text-amber-600',
}

const INTRO_ITEMS = {
  student: [
    'Your project submission is reviewed',
    'Your supervisor sends feedback',
    'A revision is requested',
    'Your project is approved',
    'An administrator adds you to a project group',
    'Your proposal or project defense is scheduled',
  ],
  assessor: ['A new project is assigned to you', 'A student resubmits a project you sent back for revision'],
  admin: [
    'A student submits a project that needs an assessor assigned',
    'A group submits a project document for review',
  ],
}

function groupByDate(notifications) {
  const groups = { Today: [], Yesterday: [], 'Earlier this week': [], Earlier: [] }
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const n of notifications) {
    const created = new Date(n.created_at)
    const days = Math.floor((startOfToday - new Date(created.getFullYear(), created.getMonth(), created.getDate())) / 86400000)

    if (days <= 0) groups.Today.push(n)
    else if (days === 1) groups.Yesterday.push(n)
    else if (days <= 7) groups['Earlier this week'].push(n)
    else groups.Earlier.push(n)
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function NotificationsPage({ apiPrefix, role }) {
  const navigate = useNavigate()
  const { data: rawNotifications, error: swrError, mutate } = useSWR(`${apiPrefix}/notifications`)
  
  const notifications = useMemo(() => {
    if (!rawNotifications) return null
    return rawNotifications.filter((n) => describeNotification(n) !== null)
  }, [rawNotifications])

  const isLoading = !rawNotifications && !swrError

  const [filter, setFilter] = useState('all')
  const introKey = `fyp_notif_intro_dismissed_${role}`
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem(introKey) && !sessionStorage.getItem(introKey)
    } catch {
      return false
    }
  })

  function dismissIntro(permanent) {
    try {
      ;(permanent ? localStorage : sessionStorage).setItem(introKey, '1')
    } catch {
      // localStorage/sessionStorage can throw in private-browsing contexts — the
      // card just reappears next visit, which is a harmless fallback.
    }
    setShowIntro(false)
  }

  async function openNotification(n) {
    const info = describeNotification(n)
    if (!n.read_at) {
      await client.post(`${apiPrefix}/notifications/${n.id}/read`)
      mutate(
        (prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
        { revalidate: false }
      )
    }
    if (info?.link) navigate(info.link)
  }

  const visible = useMemo(() => {
    if (!notifications) return []
    return filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications
  }, [notifications, filter])

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0
  const groups = groupByDate(visible)
  let cardIndex = 0

  return (
    <div className="space-y-6">
      <PageHeading description="Updates on your project, all in one place.">Notifications</PageHeading>

      {showIntro && (
        <Card className="bg-gradient-to-br from-blue-50 to-card">
          <h2 className="text-base font-semibold text-foreground">Get notified about important project updates</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll notify you when:</p>
          <ul className="mt-3 space-y-1.5">
            {(INTRO_ITEMS[role] || []).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" className="text-xs" onClick={() => dismissIntro(false)}>
              Later
            </Button>
            <Button className="text-xs" onClick={() => dismissIntro(true)}>
              Got it
            </Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {['all', 'unread'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === key ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {key === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
            description={
              filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Your project updates and important notifications will appear here once you receive them.'
            }
          />
        ) : (
          <div className="space-y-6">
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
                <ul className="divide-y divide-border">
                  {items.map((n) => {
                    const info = describeNotification(n)
                    const isUnread = !n.read_at
                    if (!info) return null
                    const Icon = info.icon

                    const delay = stagger(cardIndex++)

                    return (
                      <li key={n.id} className="animate-fade-up" style={delay}>
                        <button
                          onClick={() => openNotification(n)}
                          className={`flex w-full items-start gap-3 rounded-xl px-2 py-3.5 text-left transition hover:bg-muted ${
                            isUnread ? 'bg-blue-500/10/40' : ''
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ICON_VARIANT_STYLES[info.variant]}`}
                          >
                            <Icon />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                              <p className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                {info.title}
                              </p>
                              <span className="text-xs whitespace-nowrap text-muted-foreground">{formatTime(n.created_at)}</span>
                            </div>
                            <p className="mt-0.5 text-[15px] leading-[1.7] break-words text-foreground">{info.description}</p>
                          </div>
                          {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
