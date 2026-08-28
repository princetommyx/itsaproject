import { useEffect, useState } from 'react'
import client from '../../api/client'
import { Badge, Button, Card, Input, Textarea } from '../../components/ui'

export default function StudentSupport() {
  const [complaints, setComplaints] = useState(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  function load() {
    client.get('/student/complaints').then((res) => setComplaints(res.data))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post('/student/complaints', { subject, message })
      setSubject('')
      setMessage('')
      load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Support Tickets</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">File a New Ticket</h2>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Your Tickets</h2>
        {complaints === null ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : complaints.length === 0 ? (
          <p className="text-sm text-slate-500">No support tickets filed yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">{c.subject}</p>
                  <p className="text-slate-500">{c.message}</p>
                </div>
                <Badge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
