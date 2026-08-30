import { useState } from 'react'
import { Button, Input } from '../../../components/ui'
import { FieldGrid, SectionCard } from '../../../components/SectionLayout'
import { useSaveSettings } from './useSaveSettings'

export default function GeneralSettings({ settings, onSaved }) {
  const [form, setForm] = useState({
    school_name: settings.school_name ?? '',
    short_name: settings.short_name ?? '',
    department: settings.department ?? '',
    academic_year: settings.academic_year ?? '',
    current_session: settings.current_session ?? '',
  })
  const { save, saving } = useSaveSettings(onSaved)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <SectionCard
      title="General"
      description="How the institution and the current academic period are named across the system."
      action={
        <Button onClick={() => save(form)} loading={saving} disabled={saving}>
          Save Changes
        </Button>
      }
    >
      <FieldGrid>
        <Input label="School Name" value={form.school_name} onChange={set('school_name')} />
        <Input
          label="Short Name"
          placeholder="UPSA"
          value={form.short_name}
          onChange={set('short_name')}
        />
        <Input label="Department" value={form.department} onChange={set('department')} />
        <Input
          label="Academic Year"
          placeholder="2025/2026"
          value={form.academic_year}
          onChange={set('academic_year')}
        />
        <Input
          label="Current Session"
          placeholder="Second Semester"
          value={form.current_session}
          onChange={set('current_session')}
        />
      </FieldGrid>
    </SectionCard>
  )
}
