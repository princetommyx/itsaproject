import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeading, STATUS_LABELS } from '../../../components/ui'
import { SkeletonList } from '../../../components/Skeleton'
import { MessageIcon } from '../../../components/icons'

const STATUSES = ['open', 'in_progress', 'resolved']

export default function Complaints() {
  const toast = useToast()
  const { data: complaints, error: swrError, mutate } = useSWR('/admin/complaints')
  const isLoading = !complaints && !swrError

  async function updateStatus(id, status) {
    await client.put(`/admin/complaints/${id}`, { status })
    toast.success(`Ticket marked ${STATUS_LABELS[status] || status}.`)
    mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Messages and complaints filed by students, all in one place.">Complaints</PageHeading>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-foreground">Student Complaints</h2>
        {isLoading ? (
          <SkeletonList rows={4} />
        ) : swrError ? (
          <ErrorState title="Couldn't load complaints" onRetry={() => mutate()} />
        ) : complaints.length === 0 ? (
          <EmptyState icon={MessageIcon} title="No complaints have been filed" />
        ) : (
          <ul className="divide-y divide-border">
            {complaints.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={c.student?.name} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.subject}</p>
                    <p className="text-[15px] leading-[1.75] text-foreground">{c.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Filed by {c.student?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={c.status} />
                  <select
                    className="rounded-lg border border-border px-2 py-1 text-xs transition duration-150 hover:border-ring/60 focus:border-brand-ink focus:ring-4 focus:ring-ring/25 focus:outline-none"
                    value={c.status}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
