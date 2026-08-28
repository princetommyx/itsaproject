import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { Button, Card, StatCard } from '../../../components/ui'

const METRICS = [
  { key: 'total_submitted', label: 'Total Submitted', variant: 'pink' },
  { key: 'unassigned', label: 'Awaiting Assignment', variant: 'gold' },
  { key: 'pending', label: 'Under Review', variant: 'blue' },
  { key: 'approved', label: 'Approved', variant: 'violet' },
  { key: 'refine', label: 'Needs Refinement', variant: 'pink' },
  { key: 'total_students', label: 'Total Students', variant: 'gold' },
  { key: 'total_assessors', label: 'Total Assessors', variant: 'blue' },
]

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    client.get('/admin/dashboard').then((res) => setStats(res.data))
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await client.get('/admin/projects/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'project-mapping.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      setExporting(false)
    }
  }

  if (!stats) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map((m) => (
          <StatCard key={m.key} label={m.label} value={stats[m.key]} variant={m.variant} />
        ))}
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-800">Data Export</h2>
        <p className="mb-4 text-sm text-slate-500">
          Export the full Project → Members → Assessor mapping as an Excel file.
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? 'Preparing...' : 'Export to Excel'}
        </Button>
      </Card>
    </div>
  )
}
