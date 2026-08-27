import { useState } from 'react'
import Overview from './sections/Overview'
import ImportStudents from './sections/ImportStudents'
import Assignments from './sections/Assignments'
import StaffManagement from './sections/StaffManagement'
import LoginLogs from './sections/LoginLogs'
import Complaints from './sections/Complaints'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'assignments', label: 'Assign Assessors' },
  { key: 'import', label: 'Import Students' },
  { key: 'staff', label: 'Staff Accounts' },
  { key: 'logs', label: 'Login Logs' },
  { key: 'complaints', label: 'Complaints' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Admin Dashboard</h1>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-slate-200 whitespace-nowrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-t-md px-3 py-2 text-sm font-medium sm:px-4 ${
                tab === t.key
                  ? 'border-b-2 border-upsa-blue text-upsa-blue'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'assignments' && <Assignments />}
      {tab === 'import' && <ImportStudents />}
      {tab === 'staff' && <StaffManagement />}
      {tab === 'logs' && <LoginLogs />}
      {tab === 'complaints' && <Complaints />}
    </div>
  )
}
