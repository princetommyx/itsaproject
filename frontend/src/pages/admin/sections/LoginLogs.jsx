import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { Card } from '../../../components/ui'

export default function LoginLogs() {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    client.get('/admin/login-logs').then((res) => setLogs(res.data.data))
  }, [])

  if (logs === null) return <p className="text-slate-500">Loading...</p>

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Login Audit Trail</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">IP Address</th>
              <th className="py-2 pr-4">Device</th>
              <th className="py-2 pr-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2 pr-4">{log.user?.name}</td>
                <td className="py-2 pr-4 capitalize">{log.user?.role}</td>
                <td className="py-2 pr-4">{log.ip_address}</td>
                <td className="max-w-xs truncate py-2 pr-4">{log.user_agent}</td>
                <td className="py-2 pr-4">{new Date(log.login_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="py-4 text-sm text-slate-500">No login activity yet.</p>}
      </div>
    </Card>
  )
}
