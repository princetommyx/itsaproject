import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Avatar, Badge, Card, EmptyState, PageHeading, STATUS_LABELS } from '../../../components/ui'
import { SkeletonList } from '../../../components/Skeleton'
import { MessageIcon } from '../../../components/icons'

const STATUSES = ['open', 'in_progress', 'resolved']

export default function Complaints() {
  const toast = useToast()
  const [complaints, setComplaints] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/admin/complaints').then((res) => setComplaints(res.data))
  }

  async function updateStatus(id, status) {
    await client.put(`/admin/complaints/${id}`, { status })
    toast.success(`Ticket marked ${STATUS_LABELS[status] || status}.`)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Support tickets filed by students, all in one place.">Complaints</PageHeading>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Student Complaints</h2>
        {complaints === null ? (
          <SkeletonList rows={4} />
        ) : complaints.length === 0 ? (
          <EmptyState icon={MessageIcon} title="No complaints have been filed" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={c.student?.name} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{c.subject}</p>
                    <p className="text-sm text-slate-500">{c.message}</p>
                    <p className="mt-1 text-xs text-slate-400">Filed by {c.student?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={c.status} />
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs transition duration-150 hover:border-slate-300 focus:border-upsa-blue focus:ring-4 focus:ring-upsa-blue/10 focus:outline-none"
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
