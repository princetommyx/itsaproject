import { useState } from 'react'
import client from '../api/client'
import { useToast } from '../context/ToastContext'
import { Button, Input } from './ui'
import { formatDateTime, toDateTimeLocal } from '../lib/formatDate'

/**
 * Where an administrator sets a group's defense slots.
 *
 * Both dates are optional and independently clearable: the proposal defense
 * is usually scheduled months before the final one, and a cancelled sitting
 * has to be removable rather than left showing a date that has passed.
 * Saving either one notifies the whole group — a date they don't know about
 * is no date at all.
 */
export default function DefenseScheduleCard({ project, onSaved }) {
  const toast = useToast()
  const [proposal, setProposal] = useState(toDateTimeLocal(project.proposal_defense_at))
  const [final, setFinal] = useState(toDateTimeLocal(project.final_defense_at))
  const [saving, setSaving] = useState(false)

  const dirty =
    proposal !== toDateTimeLocal(project.proposal_defense_at) ||
    final !== toDateTimeLocal(project.final_defense_at)

  async function save() {
    setSaving(true)
    try {
      const { data } = await client.put(`/admin/projects/${project.id}/defense`, {
        proposal_defense_at: proposal || null,
        final_defense_at: final || null,
      })

      const scheduled = proposal || final
      toast.success(scheduled ? 'Defense dates saved' : 'Defense dates cleared', {
        description: scheduled
          ? 'Everyone in the group has been notified.'
          : 'The group no longer has a scheduled defense.',
      })
      onSaved?.(data)
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not save the defense dates', { description: message || 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Defense Schedule</h3>
      <p className="mb-4 text-xs font-medium text-muted-foreground">
        Proposal defense: {formatDateTime(project.proposal_defense_at)} · Project defense:{' '}
        {formatDateTime(project.final_defense_at)}. Saving notifies the group.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Proposal Defense"
          type="datetime-local"
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
        />
        <Input
          label="Project Defense"
          type="datetime-local"
          value={final}
          onChange={(e) => setFinal(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={save} loading={saving} disabled={saving || !dirty}>
          {saving ? 'Saving...' : 'Save Defense Dates'}
        </Button>
        {(proposal || final) && (
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setProposal('')
              setFinal('')
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
