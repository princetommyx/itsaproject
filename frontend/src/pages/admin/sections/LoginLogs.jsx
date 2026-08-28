import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { Avatar, Card, EmptyState, PageHeading } from '../../../components/ui'
import { SkeletonTable } from '../../../components/Skeleton'
import { LogIcon } from '../../../components/icons'

export default function LoginLogs() {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    client.get('/admin/login-logs').then((res) => setLogs(res.data.data))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeading description="A record of every sign-in across the system.">Login Logs</PageHeading>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Login Audit Trail</h2>
        {logs === null ? (
          <SkeletonTable rows={6} cols={5} />
        ) : logs.length === 0 ? (
          <EmptyState icon={LogIcon} title="No login activity yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">IP Address</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.user?.name} className="h-7 w-7 text-[10px]" />
                        {log.user?.name}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 capitalize">{log.user?.role}</td>
                    <td className="py-2.5 pr-4">{log.ip_address}</td>
                    <td className="max-w-xs truncate py-2.5 pr-4">{log.user_agent}</td>
                    <td className="py-2.5 pr-4">{new Date(log.login_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
