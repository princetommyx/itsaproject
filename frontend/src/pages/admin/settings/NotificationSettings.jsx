import { useState } from 'react'
import { Button } from '../../../components/ui'
import { SectionCard } from '../../../components/SectionLayout'
import { useSaveSettings } from './useSaveSettings'

const TOGGLES = [
  { key: 'notify_on_submission', label: 'Submission alerts', hint: 'When a group submits a project or document.' },
  { key: 'notify_on_review', label: 'Review alerts', hint: 'When an assessor is assigned or starts a review.' },
  { key: 'notify_on_revision', label: 'Revision alerts', hint: 'When a version is sent back for changes.' },
  { key: 'notify_on_approval', label: 'Approval alerts', hint: 'When a submission is approved.' },
  { key: 'email_notifications', label: 'Send by email as well', hint: 'In-app notifications are always delivered.' },
]

export default function NotificationSettings({ settings, onSaved }) {
  const [form, setForm] = useState(
    Object.fromEntries(TOGGLES.map((t) => [t.key, settings[t.key] ?? true]))
  )
  const { save, saving } = useSaveSettings(onSaved)

  return (
    <SectionCard
      title="Notifications"
      description="Which events raise an alert, and whether they also go out by email."
      action={
        <Button onClick={() => save(form)} loading={saving} disabled={saving}>
          Save Changes
        </Button>
      }
    >
      <ul className="divide-y divide-border">
        {TOGGLES.map((toggle) => (
          <li key={toggle.key} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{toggle.label}</p>
              <p className="text-xs font-medium text-muted-foreground">{toggle.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form[toggle.key]}
              aria-label={toggle.label}
              onClick={() => setForm((f) => ({ ...f, [toggle.key]: !f[toggle.key] }))}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                form[toggle.key] ? 'bg-brand' : 'bg-muted-foreground/20'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${
                  form[toggle.key] ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
