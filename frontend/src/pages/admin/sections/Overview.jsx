import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Button, HeroStatCard, PageHeading, StatCard } from '../../../components/ui'
import { SkeletonCard, SkeletonHero, SkeletonStatCards } from '../../../components/Skeleton'

const METRICS = [
  { key: 'unassigned', label: 'Awaiting Assignment', variant: 'gold' },
  { key: 'pending', label: 'Under Review', variant: 'blue' },
  { key: 'approved', label: 'Approved', variant: 'violet' },
  { key: 'refine', label: 'Needs Refinement', variant: 'pink' },
  { key: 'total_students', label: 'Total Students', variant: 'gold' },
  { key: 'total_assessors', label: 'Total Assessors', variant: 'blue' },
]

export default function Overview() {
  const toast = useToast()
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
      toast.success('Project mapping exported.')
    } catch (err) {
      toast.error('Could not export project mapping. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <PageHeading description="Plan, assign, and track every final year project in one place.">
          Dashboard
        </PageHeading>
        <SkeletonHero />
        <SkeletonStatCards count={6} />
        <SkeletonCard lines={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading
        description="Plan, assign, and track every final year project in one place."
        actions={
          <Button onClick={handleExport} disabled={exporting} loading={exporting}>
            {exporting ? 'Preparing...' : 'Export to Excel'}
          </Button>
        }
      >
        Dashboard
      </PageHeading>

      <HeroStatCard label="Total Projects Submitted" value={stats.total_submitted} caption="All-time" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {METRICS.map((m) => (
          <StatCard key={m.key} label={m.label} value={stats[m.key]} variant={m.variant} />
        ))}
      </div>
    </div>
  )
}
