import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import upsaLogo from '../assets/upsa-logo.png'
import {
  BuildingIcon,
  ClipboardIcon,
  DashboardIcon,
  FolderIcon,
  LogIcon,
  MessageIcon,
  UsersIcon,
} from './icons'

const NAV_LINKS = {
  student: [
    { to: '/student', label: 'My Project', icon: FolderIcon },
    { to: '/student/support', label: 'Support Tickets', icon: MessageIcon },
  ],
  assessor: [{ to: '/assessor', label: 'Assigned Projects', icon: ClipboardIcon }],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: DashboardIcon },
    { section: 'Projects' },
    { to: '/admin/assignments', label: 'Assign Assessors', icon: ClipboardIcon },
    { section: 'People' },
    { to: '/admin/import', label: 'Import Students', icon: UsersIcon },
    { to: '/admin/staff', label: 'Staff Accounts', icon: BuildingIcon },
    { section: 'System' },
    { to: '/admin/logs', label: 'Login Logs', icon: LogIcon },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageIcon },
  ],
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const links = NAV_LINKS[user?.role] || []

  function handleLogout() {
    logout()
    toast.success('Logged out.')
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-gradient-to-b from-upsa-blue to-upsa-blue-dark transition-transform duration-200 md:static md:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <img src={upsaLogo} alt="UPSA" className="h-8 w-auto shrink-0 rounded bg-white p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-tight">UPSA FYP System</p>
            <p className="text-xs text-blue-100 leading-tight capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link, i) =>
            link.section ? (
              <p
                key={`section-${i}`}
                className="mt-4 mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold tracking-wider text-white/40 uppercase first:mt-0"
              >
                <span className="text-white/25">//</span> {link.section}
              </p>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-white/15 text-upsa-gold' : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <link.icon />
                </span>
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <p className="truncate px-3 pb-2 text-sm text-white/80">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-white/10 px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/20"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <MenuIcon />
          </button>
          <span className="text-sm font-semibold text-slate-800">UPSA FYP System</span>
        </header>

        <main className="flex-1 px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-5xl">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  )
}
