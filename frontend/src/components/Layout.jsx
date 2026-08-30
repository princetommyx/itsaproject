import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import useSWR, { preload } from 'swr'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/cn'
import { useToast } from '../context/ToastContext'
import { describeNotification } from '../constants/notifications'
import upsaShield from '../assets/upsa-shield.png'
import ErrorBoundary from './ErrorBoundary'

const fetcher = (url) => client.get(url).then((res) => res.data)

const PREFETCH_MAP = {
  '/student': ['/student/project'],
  '/student/documents': ['/student/documents'],
  '/student/support': ['/student/complaints'],
  '/assessor': ['/assessor/projects'],
  '/admin': ['/admin/dashboard'],
  '/admin/projects': ['/admin/projects'],
  '/admin/assignments': ['/admin/projects/unassigned', '/admin/assessors'],
  '/admin/students': ['/admin/students'],
  '/admin/logs': ['/admin/login-logs'],
  '/admin/complaints': ['/admin/complaints'],
}

function handlePrefetch(path) {
  const endpoints = PREFETCH_MAP[path]
  if (endpoints) {
    endpoints.forEach((url) => preload(url, fetcher))
  }
}

import { Avatar } from './ui'
import {
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DashboardIcon,
  FileSpreadsheetIcon,
  FolderIcon,
  LogIcon,
  LogOutIcon,
  MenuIcon,
  MessageIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  ChevronsLeftIcon,
  XIcon,
  UploadCloudIcon,
  UserCircleIcon,
  UsersIcon,
} from './icons'

const NAV_LINKS = {
  student: [
    { to: '/student', label: 'My Project', icon: FolderIcon },
    { to: '/student/documents', label: 'My Documents', icon: FileSpreadsheetIcon },
    { to: '/student/notifications', label: 'Notifications', icon: BellIcon },
    { to: '/student/support', label: 'Messages', icon: MessageIcon },
    { to: '/student/profile', label: 'My Profile', icon: UserCircleIcon },
  ],
  assessor: [
    { to: '/assessor', label: 'Assigned Projects', icon: ClipboardIcon },
    { to: '/assessor/notifications', label: 'Notifications', icon: BellIcon },
    { to: '/assessor/profile', label: 'My Profile', icon: UserCircleIcon },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: DashboardIcon },
    { section: 'Projects' },
    { to: '/admin/projects', label: 'All Projects', icon: FolderIcon },
    { to: '/admin/assignments', label: 'Assign Assessors', icon: ClipboardIcon },
    { section: 'People' },
    { to: '/admin/students', label: 'Students', icon: UsersIcon },
    { to: '/admin/import', label: 'Import Students', icon: UploadCloudIcon },
    { to: '/admin/staff', label: 'Staff Accounts', icon: BuildingIcon },
    { section: 'System' },
    { to: '/admin/logs', label: 'Login Logs', icon: LogIcon },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageIcon },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon, permission: 'settings.manage' },
    { to: '/admin/notifications', label: 'Notifications', icon: BellIcon },
    { to: '/admin/profile', label: 'My Profile', icon: UserCircleIcon },
  ],
}

const PROFILE_PATH = {
  student: '/student/profile',
  assessor: '/assessor/profile',
  admin: '/admin/profile',
}

const NOTIFICATIONS_PATH = {
  student: '/student/notifications',
  assessor: '/assessor/notifications',
  admin: '/admin/notifications',
}

const API_PREFIX = { student: '/student', assessor: '/assessor', admin: '/admin' }

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full py-0.5 pr-1.5 pl-0.5 transition hover:bg-muted"
      >
        <Avatar name={user?.name} className="h-8 w-8 text-[11px]" />
        <span className={`text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-[60] mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-lg"
        >
          <p className="truncate px-4 pt-1 pb-2 text-xs font-semibold text-muted-foreground">
            Signed in as {user?.name}
          </p>
          <div className="mx-3 mb-1 border-t border-border" />
          <Link
            to={PROFILE_PATH[user?.role] || '/'}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <UserCircleIcon />
            Profile
          </Link>
          <div className="mx-3 my-1 border-t border-border" />
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            <LogOutIcon />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}



export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef(null)
  const toggleRef = useRef(null)

  // Above md the sidebar is a permanent part of the layout, not a drawer. The
  // difference matters for more than styling: the modal behaviours below
  // (scroll lock, escape-to-close, hiding the panel from the tab order) are
  // all wrong for a sidebar that is simply always there.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )

  // Collapsed to icons only. Remembered per browser, because whether you want
  // labels or screen width is a property of the machine you're sitting at.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fyp_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('fyp_sidebar_collapsed', collapsed ? '1' : '0')
    } catch {
      // Forgetting the preference is survivable.
    }
  }, [collapsed])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')

    function handleChange(event) {
      setIsDesktop(event.matches)
      // Rotating to landscape while the drawer is open would otherwise leave
      // the page scroll locked with no visible drawer to close.
      if (event.matches) setDrawerOpen(false)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!drawerOpen || isDesktop) return

    // Without this the page scrolls underneath the open drawer, which is the
    // clearest tell that a menu isn't a real drawer.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }

    window.addEventListener('keydown', handleKey)

    // Move focus into the drawer so a keyboard or screen-reader user lands
    // inside what just opened rather than behind it.
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [drawerOpen, isDesktop])

  function closeDrawer() {
    setDrawerOpen(false)
    // Hand focus back to the control that opened it, so the tab position
    // isn't lost to an element that is now off-screen.
    toggleRef.current?.focus()
  }
  // A nav item can name a permission. Someone whose role lacks it never sees
  // the link, rather than finding a page that refuses them when they arrive.
  const links = (NAV_LINKS[user?.role] || []).filter(
    (link) => !link.permission || (user?.permissions ?? []).includes(link.permission)
  )

  // Shares its SWR cache key with NotificationsPage, so the list is fetched
  // once and reused between the sidebar badge and the notifications page —
  // not re-fetched in full on every route change.
  const apiPrefix = user?.role ? API_PREFIX[user.role] : null
  const { data: notifications } = useSWR(apiPrefix ? `${apiPrefix}/notifications` : null)
  const unreadCount = notifications?.filter((n) => !n.read_at && describeNotification(n) !== null).length ?? 0

  function handleLogout() {
    logout()
    toast.success('Logged out.')
  }

  return (
    // The template's shell: the whole application sits inside one rounded card
    // floating on the page background, rather than running edge to edge.
    <div className="min-h-screen bg-background px-0 py-0 sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-screen overflow-hidden bg-card ring-border sm:min-h-[calc(100vh-2.5rem)] sm:rounded-3xl sm:shadow-sm sm:ring-1">
      {/* Kept mounted rather than conditionally rendered, so it can fade out
          with the drawer instead of vanishing the instant it closes. */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Slides in from the left edge, full height, over a dimmed page — the
          shape every mobile OS uses for navigation. It leaves a strip of the
          page visible on the right, which keeps you oriented and gives you an
          obvious place to tap to dismiss.

          Above md every one of these drawer properties is turned off and the
          same element becomes the static sidebar; the markup is shared so the
          navigation itself is defined once. */}
      <aside
        {...(isDesktop
          ? {}
          : { role: 'dialog', 'aria-modal': true, 'aria-label': 'Navigation menu' })}
        inert={!isDesktop && !drawerOpen ? true : undefined}
        className={cn(
          'bg-sidebar-gradient fixed inset-y-0 left-0 z-40 flex w-[17.5rem] max-w-[85vw] shrink-0 flex-col text-white shadow-2xl shadow-black/40 transition-[transform,width] duration-300 ease-out will-change-transform motion-reduce:transition-none',
          'md:static md:inset-auto md:max-w-none md:translate-x-0 md:shadow-none',
          collapsed ? 'md:w-[4.75rem]' : 'md:w-60',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-4 py-5"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark hideWordmark={collapsed} />
          </div>

          <button
            ref={closeButtonRef}
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 md:hidden"
          >
            <XIcon size={18} />
          </button>

          {/* Collapsing to icons is a desktop affordance: on mobile the whole
              panel is already dismissed rather than narrowed. */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 md:flex',
              collapsed && 'absolute right-3'
            )}
          >
            <ChevronsLeftIcon size={18} className={collapsed ? "rotate-180" : ""} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {links.map((link, i) =>
            link.section ? (
              <p
                key={`section-${i}`}
                className={cn(
                  'mt-4 mb-1 px-3 text-xs font-medium tracking-[0.14em] text-white/45 uppercase first:mt-0',
                  // A heading over icons with no labels under it says nothing,
                  // so it becomes a divider instead.
                  collapsed && 'md:mx-3 md:mt-3 md:mb-2 md:h-px md:overflow-hidden md:bg-white/15 md:px-0 md:text-transparent'
                )}
              >
                {link.section}
              </p>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onMouseEnter={() => handlePrefetch(link.to)}
                onClick={() => setDrawerOpen(false)}
                // The template's active treatment: a solid white pill with the
                // label and icon in the brand colour, which reads as a tab cut
                // out of the gradient rather than a highlight laid over it.
                title={collapsed ? link.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition duration-150',
                    collapsed && 'md:justify-center md:px-0',
                    isActive
                      // Literally white, not bg-card: this pill reads as a
                      // tab cut out of the brand gradient, so it stays white
                      // in dark mode too — a themed surface here would make
                      // the active row vanish into the sidebar.
                      ? 'bg-white text-brand shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <span className="flex shrink-0 items-center justify-center">
                  <link.icon />
                </span>
                <span className={cn('flex-1', collapsed && 'md:hidden')}>{link.label}</span>
                {link.to === NOTIFICATIONS_PATH[user?.role] && unreadCount > 0 && (
                  <span
                    className={cn(
                      'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-black/80',
                      // Collapsed there is no room beside the label, so the
                      // count rides the icon instead of disappearing.
                      collapsed && 'md:absolute md:top-1 md:right-1 md:h-4 md:min-w-4 md:text-[10px]'
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div
          className="shrink-0 px-3 pt-2 pb-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className={cn('rounded-2xl bg-white/10 p-3', collapsed && 'md:hidden')}>
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-xs text-white/70 capitalize">
              {user?.role_name || user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-center text-[15px] font-bold text-black/80 transition hover:brightness-95',
              collapsed && 'md:px-0'
            )}
          >
            <LogOutIcon />
            <span className={cn(collapsed && 'md:hidden')}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* The content column: a muted panel inside the shell, so the white
          cards on it read as raised rather than flush. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-muted">
        <header
          className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <button
              ref={toggleRef}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className="-ml-1 rounded-full p-2 text-foreground hover:bg-muted md:hidden"
            >
              <MenuIcon />
            </button>

            {/* On mobile the sidebar is closed, so the topbar carries the
                brand; on desktop the sidebar already shows it. */}
            <div className="flex items-center gap-2.5 md:hidden">
              <BrandMarkCompact />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <NotificationsButton
                to={NOTIFICATIONS_PATH[user?.role]}
                count={unreadCount}
              />
              <UserMenu user={user} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-7">
          <div key={location.pathname} className="animate-page-enter mx-auto max-w-6xl">
            {/* Keyed on the route so navigating away clears a crashed page. */}
            <ErrorBoundary key={location.pathname}>{children ?? <Outlet />}</ErrorBoundary>
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

/**
 * Light / dark, with the system option folded in: the button shows what you'd
 * get if you pressed it, and pressing it commits to that rather than leaving
 * you on "system" wondering why it changed at sunset.
 */
function ThemeToggle() {
  const { resolved, setTheme } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

/**
 * A link, not a dropdown: the notifications page already renders the list with
 * grouping, filtering and read state, and a second miniature copy in a menu
 * would be one more thing to keep in step for no gain.
 */
function NotificationsButton({ to, count }) {
  if (!to) return null

  return (
    <Link
      to={to}
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <BellIcon />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

/**
 * The mark in the navigation. Falls back to the built-in UPSA shield and
 * wordmark until an administrator uploads their own, so a fresh install still
 * looks like something rather than an empty box.
 */
function BrandMark({ hideWordmark = false }) {
  const { settings } = useSettings()

  return (
    <>
      <img
        src={settings.logo_url || upsaShield}
        alt={settings.school_name || 'UPSA'}
        className="h-10 w-10 shrink-0 rounded-xl bg-card object-contain p-1.5"
      />
      <span
        className={cn(
          'truncate text-lg font-extrabold tracking-tight text-white',
          hideWordmark && 'md:hidden'
        )}
      >
        {settings.short_name?.trim() || 'UPSA'}
      </span>
    </>
  )
}

/** The topbar's mark, which sits on the page ground rather than the gradient. */
function BrandMarkCompact() {
  const { settings } = useSettings()

  return (
    <>
      <img
        src={settings.logo_url || upsaShield}
        alt={settings.school_name || 'UPSA'}
        className="h-8 w-8 shrink-0 rounded-lg bg-card object-contain p-1 ring-1 ring-border"
      />
      <span className="truncate text-base font-extrabold tracking-tight text-foreground">
        {settings.short_name?.trim() || 'UPSA'}
      </span>
    </>
  )
}



