import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { Badge, Button, Card } from '../../components/ui'
import { SkeletonList } from '../../components/Skeleton'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [label, secs] of units) {
    const value = Math.floor(seconds / secs)
    if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/student/notifications').then((res) => setNotifications(res.data))
  }

  async function markRead(id) {
    await client.post(`/student/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Notifications</h1>

      <Card>
        {notifications === null ? (
          <SkeletonList rows={3} />
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-500">You have no notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const isUnread = !n.read_at
              const { project_title: title, status, feedback } = n.data

              return (
                <li
                  key={n.id}
                  onClick={() => isUnread && markRead(n.id)}
                  className={`flex gap-3 py-4 first:pt-0 last:pb-0 ${isUnread ? 'cursor-pointer' : ''}`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-upsa-gold' : 'bg-transparent'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-sm ${isUnread ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                        {status === 'approved' ? 'Project approved' : 'Project sent back for refinement'}
                      </p>
                      <span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 break-words">{title}</p>

                    {status === 'approved' ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Congratulations! Your assessor has approved your project.
                      </p>
                    ) : (
                      <>
                        {feedback && (
                          <div className="mt-2 rounded-md bg-pink-50 p-3 text-sm text-pink-800">
                            <strong>Feedback:</strong> {feedback}
                          </div>
                        )}
                        <Link to="/student" className="mt-3 inline-block">
                          <Button variant="secondary" className="text-xs">
                            Go Refine Project
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                  <Badge status={status} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
