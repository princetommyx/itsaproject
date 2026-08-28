import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeading } from './ui'
import PasswordTab from './PasswordTab'

const TABS = [
  { key: 'personal', label: 'Personal Profile' },
  { key: 'password', label: 'Password' },
]

export default function ProfileShell({ homePath, homeLabel, children }) {
  const [tab, setTab] = useState('personal')

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link to={homePath} className="hover:text-upsa-blue hover:underline">
          {homeLabel}
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-500">Profile</span>
      </nav>

      <PageHeading description="Your account details and security settings.">Profile</PageHeading>

      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition duration-150 ${
                tab === t.key ? 'border-upsa-blue text-upsa-blue' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'personal' ? children : <PasswordTab />}
    </div>
  )
}
