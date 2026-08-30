import { useState } from 'react'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Button, Card, ErrorState, HeroStatCard, PageHeading, StatCard, stagger } from '../../../components/ui'
import { SkeletonCard, SkeletonHero, SkeletonStatCards } from '../../../components/Skeleton'
import StatusBreakdownChart from '../../../components/StatusBreakdownChart'

const STATUS_ROWS = [
  { key: 'unassigned', label: 'Awaiting Assignment', variant: 'gold' },
  { key: 'pending', label: 'Under Review', variant: 'blue' },
  { key: 'approved', label: 'Approved', variant: 'violet' },
  { key: 'refine', label: 'Needs Refinement', variant: 'pink' },
]

const PEOPLE_METRICS = [
  { key: 'total_students', label: 'Total Students', variant: 'gold' },
  { key: 'total_assessors', label: 'Total Assessors', variant: 'blue' },
]

export default function Overview() {
  const toast = useToast()
  const { data: stats, error: swrError, mutate } = useSWR('/admin/dashboard')
  const isLoading = !stats && !swrError
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await client.get('/admin/projects/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'upsa-project-data.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Project data exported', {
        description: 'Two sheets: one per group, one per student — with topic, supervisor, and defense dates.',
      })
    } catch {
      toast.error('Could not export project data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (swrError) {
    return (
      <Card>
        <ErrorState
          title="Couldn't load the dashboard"
          description="We couldn't reach the server. Check your connection and try again."
          onRetry={() => mutate()}
        />
      </Card>
    )
  }

  if (isLoading) {
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
            {exporting ? 'Preparing...' : 'Export Data'}
          </Button>
        }
      >
        Dashboard
      </PageHeading>

      <div className="animate-fade-up">
        <HeroStatCard label="Total Projects Submitted" value={stats.total_submitted} caption="All-time" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PEOPLE_METRICS.map((m, i) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={stats[m.key]}
            variant={m.variant}
            className="animate-fade-up"
            style={stagger(i)}
          />
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Projects by Status</h2>
        <StatusBreakdownChart rows={STATUS_ROWS.map((r) => ({ ...r, value: stats[r.key] }))} />
      </Card>
    </div>
  )
}
