import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import useSWR, { preload } from 'swr'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
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
  MessageIcon,
  SettingsIcon,
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
        className="flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-0.5 hover:bg-white/10"
      >
        <Avatar name={user?.name} className="h-8 w-8 text-[11px]" />
        <span className={`text-white/60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-[60] mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-lg shadow-slate-900/10"
        >
          <Link
            to={PROFILE_PATH[user?.role] || '/'}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <UserCircleIcon />
            Profile
          </Link>
          <div className="mx-3 my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOutIcon />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 5h16M2 10h16M2 15h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
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
    <div className="min-h-screen bg-slate-100 md:flex">
      {/* Kept mounted rather than conditionally rendered, so it can fade out
          with the drawer instead of vanishing the instant it closes. */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-950/50 transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden ${
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
        className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] max-w-[85vw] shrink-0 flex-col bg-gradient-to-b from-upsa-blue to-upsa-blue-dark shadow-2xl shadow-black/40 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none md:static md:inset-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3">
            <BrandMark />
          </div>
          <button
            ref={closeButtonRef}
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {links.map((link, i) =>
            link.section ? (
              <p
                key={`section-${i}`}
                className="mt-4 mb-1 px-3 text-xs font-medium tracking-[0.14em] text-white/45 uppercase first:mt-0"
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
                // Active is just a filled row with the icon and label in gold,
                // matching the reference. No left accent bar — the fill and
                // the colour already say which page you're on.
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-3 py-2.5 text-base font-medium transition duration-150 ${
                    isActive ? 'bg-white/10 text-upsa-gold' : 'text-white hover:bg-white/5'
                  }`
                }
              >
                {/* Bare icon, no badge — the reference sits its icons straight
                    on the dark ground, which reads cleaner and keeps the glyph
                    at full contrast. It inherits the row's colour, so it turns
                    gold along with the label when active. */}
                <span className="flex shrink-0 items-center justify-center">
                  <link.icon />
                </span>
                <span className="flex-1">{link.label}</span>
                {link.to === NOTIFICATIONS_PATH[user?.role] && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-upsa-gold px-1 text-xs font-semibold text-upsa-blue-dark">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-4 py-3.5" style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          <p className="truncate px-1 pb-3 text-sm text-white/70">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-upsa-gold py-3.5 text-center text-base font-bold text-upsa-blue-dark transition hover:brightness-95"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 bg-upsa-blue-dark px-4 pb-3 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-3">
              <BrandMark />
            </div>
            <div className="flex items-center gap-1">
              <UserMenu user={user} onLogout={handleLogout} />
              <button
                ref={toggleRef}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                className="rounded-full p-2 text-white hover:bg-white/10"
              >
                <MenuIcon />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:py-8">
          <div key={location.pathname} className="animate-page-enter mx-auto max-w-5xl">
            {/* Keyed on the route so navigating away clears a crashed page. */}
            <ErrorBoundary key={location.pathname}>{children ?? <Outlet />}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * The mark in the navigation. Falls back to the built-in UPSA shield and
 * wordmark until an administrator uploads their own, so a fresh install still
 * looks like something rather than an empty box.
 */
function BrandMark() {
  const { settings } = useSettings()

  return (
    <>
      <img
        src={settings.logo_url || upsaShield}
        alt={settings.school_name || 'UPSA'}
        className="h-10 w-10 shrink-0 rounded-2xl bg-white object-contain p-1.5"
      />
      <span className="text-xl font-extrabold tracking-tight text-upsa-gold">
        {settings.short_name?.trim() || 'UPSA'}
      </span>
    </>
  )
}
