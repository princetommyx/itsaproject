import { useState } from 'react'
import { Button, Input } from '../../../components/ui'
import { FieldGrid, SectionCard } from '../../../components/SectionLayout'
import { toDateTimeLocal } from '../../../lib/formatDate'
import { useSaveSettings } from './useSaveSettings'

const FILE_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip']

export default function SubmissionSettings({ settings, onSaved }) {
  const [types, setTypes] = useState(settings.allowed_file_types ?? ['pdf', 'doc', 'docx'])
  const [maxSize, setMaxSize] = useState(settings.max_file_size_mb ?? 20)
  const [maxRevisions, setMaxRevisions] = useState(settings.max_revisions ?? 0)
  const [proposalDeadline, setProposalDeadline] = useState(toDateTimeLocal(settings.proposal_deadline))
  const [finalDeadline, setFinalDeadline] = useState(toDateTimeLocal(settings.final_deadline))
  const { save, saving } = useSaveSettings(onSaved)

  function toggleType(type) {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  return (
    <SectionCard
      title="Submission Rules"
      description="Enforced on the server, so a change here applies to every upload immediately."
      action={
        <Button
          disabled={saving || types.length === 0}
          loading={saving}
          onClick={() =>
            save({
              allowed_file_types: types,
              max_file_size_mb: Number(maxSize) || 20,
              max_revisions: Number(maxRevisions) || 0,
              proposal_deadline: proposalDeadline || null,
              final_deadline: finalDeadline || null,
            })
          }
        >
          Save Changes
        </Button>
      }
    >
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-foreground">Allowed File Types</span>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold uppercase transition ${
                types.includes(type)
                  ? 'bg-brand text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {types.length === 0 && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            Pick at least one type, or students will not be able to upload anything.
          </p>
        )}
      </div>

      <FieldGrid className="mt-5">
        <Input
          label="Maximum File Size (MB)"
          type="number"
          min="1"
          max="100"
          value={maxSize}
          onChange={(e) => setMaxSize(e.target.value)}
        />
        <Input
          label="Revision Limit"
          type="number"
          min="0"
          max="20"
          value={maxRevisions}
          onChange={(e) => setMaxRevisions(e.target.value)}
        />
        <Input
          label="Proposal Deadline"
          type="datetime-local"
          value={proposalDeadline}
          onChange={(e) => setProposalDeadline(e.target.value)}
        />
        <Input
          label="Final Project Deadline"
          type="datetime-local"
          value={finalDeadline}
          onChange={(e) => setFinalDeadline(e.target.value)}
        />
      </FieldGrid>

      <p className="mt-3 text-xs font-medium text-muted-foreground">
        A revision limit of 0 means unlimited. A deadline left empty never closes submissions.
      </p>
    </SectionCard>
  )
}
