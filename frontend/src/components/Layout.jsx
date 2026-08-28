import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = {
  student: [{ to: '/student', label: 'My Project' }],
  assessor: [{ to: '/assessor', label: 'Assigned Projects' }],
  admin: [{ to: '/admin', label: 'Dashboard' }],
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-upsa-blue shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-upsa-gold font-bold text-upsa-blue-dark">
              U
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                <span className="hidden sm:inline">UPSA Final Year Project Portal</span>
                <span className="sm:hidden">UPSA Portal</span>
              </p>
              <p className="text-xs text-blue-100 leading-tight capitalize">{user?.role}</p>
            </div>
          </div>

          <nav className="flex items-center gap-3 sm:gap-4">
            {(NAV_LINKS[user?.role] || []).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-upsa-gold' : 'text-white/90 hover:text-white'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <span className="hidden text-sm text-white/80 sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
