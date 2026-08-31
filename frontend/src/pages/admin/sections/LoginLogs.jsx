import useSWR from 'swr'
import client from '../../../api/client'
import { Avatar, Card, EmptyState, ErrorState, PageHeading } from '../../../components/ui'
import { SkeletonTable } from '../../../components/Skeleton'
import { LogIcon } from '../../../components/icons'

export default function LoginLogs() {
  const { data: logsData, error: swrError } = useSWR('/admin/login-logs')
  const logs = logsData?.data ?? []
  const isLoading = !logsData && !swrError

  return (
    <div className="space-y-6">
      <PageHeading>Login Logs</PageHeading>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-foreground">Login Audit Trail</h2>
        {isLoading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : swrError ? (
          <ErrorState title="Couldn't load login logs" />
        ) : logs.length === 0 ? (
          <EmptyState icon={LogIcon} title="No login activity yet" />
        ) : (
          <>
            {/* Below sm, a 5-column table has no room to show every column, and a
                horizontal scroll hides Device/Time with no hint they exist — so
                mobile gets a stacked card per entry instead of a squeezed table. */}
            <ul className="divide-y divide-border sm:hidden">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <Avatar name={log.user?.name} className="mt-0.5 h-9 w-9 shrink-0 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="font-medium text-foreground">{log.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.login_time).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{log.user?.role} &middot; {log.ip_address}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.user_agent}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">IP Address</th>
                    <th className="py-2 pr-4">Device</th>
                    <th className="py-2 pr-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-muted">
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
          </>
        )}
      </Card>
    </div>
  )
}
