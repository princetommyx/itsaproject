import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import client from '../api/client'
import { Button, Card, EmptyState, ErrorState, PageHeading, stagger } from './ui'
import { SkeletonList } from './Skeleton'
import { BellIcon, ChevronRightIcon, InboxIcon, MessageIcon } from './icons'
import { describeNotification } from '../constants/notifications'
import { relativeTime } from '../lib/formatDate'
import { cn } from '../lib/cn'

// "Today" / "Yesterday" / a plain date for anything older — `visible` is
// already newest-first from the server, so this only needs to notice when
// the label changes, not re-sort anything.
function dateGroupLabel(iso) {
  const date = new Date(iso)
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

  async function markAllRead() {
    const unread = (notifications ?? []).filter((n) => !n.read_at)
    if (unread.length === 0) return

    // Written into the cache first: the list should go quiet the moment it is
    // pressed, not after every request has come back one by one.
    const now = new Date().toISOString()
    mutate((prev) => prev?.map((x) => (x.read_at ? x : { ...x, read_at: now })), { revalidate: false })
    await Promise.all(unread.map((n) => client.post(`${apiPrefix}/notifications/${n.id}/read`)))
  }

  const visible = useMemo(() => {
    if (!notifications) return []
    return filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications
  }, [notifications, filter])

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0

  const groups = useMemo(() => {
    const out = []
    for (const n of visible) {
      const label = dateGroupLabel(n.created_at)
      const last = out[out.length - 1]
      if (last?.label === label) last.items.push(n)
      else out.push({ label, items: [n] })
    }
    return out
  }, [visible])

  return (
    <div className="space-y-6">
      <PageHeading>Notifications</PageHeading>

      {/* A brand tint rather than blue-50. That step is an opaque light colour
          with no dark variant, so in dark mode this card kept painting itself
          pale grey while its text stayed light — the body copy and bullets
          were grey on grey and essentially unreadable. An alpha tint
          composites over --card in either theme, and follows the brand colour
          an administrator has chosen.

          Flat, not a diagonal fade to --card: a from-brand/10-to-card
          gradient is the generic "make this card feel branded" move —
          no real edge, no real identity, just a wash that reads as
          templated. A defined border and a real icon badge (the same
          ring+tint language the notification rows below use) give it the
          presence an intro card announcing "here's what we'll tell you
          about" should have. */}
      {showIntro && (
        <Card className="border border-brand-ink/25 bg-brand/10">
          <div className="flex items-start gap-3">
            {/* Tailwind's blue-500, not the brand token, for the badge itself.
                Measured: this app's brand navy is dark but genuinely
                low-chroma (#0f2d5c), so even at 15% opacity it composited to
                RGB(188,198,210) — an 22-point R-to-B gap that reads as grey
                on screen, not blue. blue-500 at the same opacity measured a
                38-point gap in the notification rows below, which is why
                those already look unmistakably blue. Matching that, rather
                than trying to push the brand tint's opacity high enough to
                compete (which starts fighting the body text's contrast). */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-300">
              <BellIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
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
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 pl-13">
            <Button variant="secondary" className="text-xs" onClick={() => dismissIntro(false)}>
              Later
            </Button>
            <Button className="text-xs" onClick={() => dismissIntro(true)}>
              Got it
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex gap-2">
            {['all', 'unread'].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                  filter === key
                    ? 'bg-brand text-brand-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {key === 'all' ? 'All' : 'Unread'}
                {key === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-bold text-black/80">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm font-semibold text-brand-ink hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4">
            <SkeletonList rows={4} />
          </div>
        ) : swrError ? (
          <div className="p-4">
            <ErrorState
              title="Couldn't load your notifications"
              description="We couldn't reach the server. Check your connection and try again."
              onRetry={() => mutate()}
            />
          </div>
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
          <ul>
            {groups.map((group) => (
              <li key={group.label}>
                <p className="bg-muted px-4 py-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>
                <ul className="divide-y divide-border">
                  {group.items.map((n, i) => {
                    const info = describeNotification(n)
                    if (!info) return null

                    const isUnread = !n.read_at

                    return (
                      <li key={n.id} className="animate-fade-up" style={stagger(i)}>
                        <button
                          onClick={() => openNotification(n)}
                          className={cn(
                            'flex w-full items-start gap-3 border-l-2 border-transparent px-4 py-3.5 text-left transition hover:bg-muted',
                            // An unread row is tinted rather than merely bolder,
                            // so the block of things still needing attention is
                            // visible without reading any of them.
                            isUnread && 'border-blue-500 bg-blue-500/[0.08] dark:bg-blue-400/[0.08]'
                          )}
                        >
                          {/* One icon for every kind of notification now,
                              rather than one colour+glyph per kind — the
                              title and description carry that distinction,
                              same as the reference this list follows. */}
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                            <MessageIcon size={18} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'truncate text-sm',
                                  isUnread ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'
                                )}
                              >
                                {info.title}
                              </p>
                              {isUnread && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                                  aria-label="Unread"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 text-[15px] leading-[1.6] break-words text-muted-foreground">
                              {info.description}
                            </p>
                            <p className="mt-1 text-xs whitespace-nowrap text-muted-foreground">
                              {relativeTime(n.created_at)}
                            </p>
                          </div>

                          {/* Decorative, not a second control — the whole row
                              is already the click target (openNotification
                              above), so this isn't a nested <button>, just the
                              visual "this opens something" cue the reference
                              draws as its own circle. */}
                          <span
                            aria-hidden="true"
                            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-border"
                          >
                            <ChevronRightIcon size={16} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
