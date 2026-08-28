import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { Badge, Card } from '../../../components/ui'

const STATUSES = ['open', 'in_progress', 'resolved']

export default function Complaints() {
  const [complaints, setComplaints] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/admin/complaints').then((res) => setComplaints(res.data))
  }

  async function updateStatus(id, status) {
    await client.put(`/admin/complaints/${id}`, { status })
    load()
  }

  if (complaints === null) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Complaints</h1>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Student Complaints</h2>
        {complaints.length === 0 ? (
          <p className="text-sm text-slate-500">No complaints have been filed.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-800">{c.subject}</p>
                  <p className="text-sm text-slate-500">{c.message}</p>
                  <p className="mt-1 text-xs text-slate-400">Filed by {c.student?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={c.status} />
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
