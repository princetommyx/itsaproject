import { useState } from 'react'
import useSWR from 'swr'
import client from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeading, Textarea } from '../../components/ui'
import { SkeletonList } from '../../components/Skeleton'
import { MessageIcon } from '../../components/icons'

export default function StudentSupport() {
  const toast = useToast()
  const { data: complaints, mutate } = useSWR('/student/complaints')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post('/student/complaints', { subject, message })
      toast.success('Message submitted.')
      setSubject('')
      setMessage('')
      mutate()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Send a message and track its status here.">Messages</PageHeading>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Send a New Message</h2>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
          <Button type="submit" disabled={submitting} loading={submitting}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Your Messages</h2>
        {!complaints ? (
          <SkeletonList rows={3} />
        ) : swrError ? (
          <ErrorState title="Couldn't load your messages" />
        ) : complaints.length === 0 ? (
          <EmptyState icon={MessageIcon} title="No messages sent yet" />
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
