import { useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { FONT_OPTIONS, useSettings } from '../../../context/SettingsContext'
import { Button, Card } from '../../../components/ui'
import { useSaveSettings } from './useSaveSettings'

const COLORS = [
  { key: 'primary_color', label: 'Primary', hint: 'Navigation, buttons and links.' },
  { key: 'secondary_color', label: 'Secondary', hint: 'Darker shade for gradients and hover states.' },
  { key: 'accent_color', label: 'Accent', hint: 'Highlights — the logo mark and key actions.' },
]

export default function AppearanceSettings({ settings, onSaved }) {
  const toast = useToast()
  const { applyTheme, refresh } = useSettings()
  const [form, setForm] = useState({
    primary_color: settings.primary_color ?? '#0f2d5c',
    secondary_color: settings.secondary_color ?? '#071e3d',
    accent_color: settings.accent_color ?? '#c9a227',
    font_family: settings.font_family ?? 'Roboto',
  })
  const [uploading, setUploading] = useState(false)
  const { save, saving } = useSaveSettings(onSaved)

  /**
   * Paint the change immediately so the admin judges it on the real
   * interface rather than a swatch. Nothing is stored until they save, and a
   * reload discards it.
   */
  function preview(next) {
    setForm(next)
    applyTheme({ ...settings, ...next })
  }

  async function uploadLogo(file) {
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('logo', file)
      await client.post('/admin/settings/logo', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refresh()
      toast.success('Logo updated')
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not upload the logo', { description: message || 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  async function removeLogo() {
    try {
      await client.delete('/admin/settings/logo')
      await refresh()
      toast.success('Logo removed', { description: 'The built-in mark is back in use.' })
    } catch {
      toast.error('Could not remove the logo')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold text-foreground">Colours</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Changes preview live. Nothing is stored until you save.
        </p>

        <div className="mt-5 space-y-4">
          {COLORS.map((color) => (
            <div key={color.key} className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label={color.label}
                value={form[color.key]}
                onChange={(e) => preview({ ...form, [color.key]: e.target.value })}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{color.label}</p>
                <p className="text-xs font-medium text-muted-foreground">{color.hint}</p>
              </div>
              <input
                aria-label={`${color.label} hex value`}
                value={form[color.key]}
                onChange={(e) => preview({ ...form, [color.key]: e.target.value })}
                className="w-28 shrink-0 rounded-lg border border-border px-3 py-2 font-mono text-sm text-foreground uppercase focus:border-brand focus:ring-4 focus:ring-ring/25 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-foreground">Font</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Each option previews in its own typeface. Pick one to apply it across the system.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.name}
              type="button"
              onClick={() => preview({ ...form, font_family: font.name })}
              className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                form.font_family === font.name
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-ring/60'
              }`}
            >
              <span className="block text-sm font-bold text-foreground">{font.name}</span>
              <span
                className="mt-0.5 block text-[15px] text-muted-foreground"
                style={{ fontFamily: font.stack }}
              >
                Final Year Project
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-foreground">Logo</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Shown in the navigation. PNG, JPG, SVG or WebP, up to 2MB.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt="Current logo"
              className="h-14 w-14 rounded-xl border border-border bg-card object-contain p-1"
            />
          )}
          <label className="cursor-pointer rounded-lg border-2 border-brand px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/5">
            {uploading ? 'Uploading…' : settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => uploadLogo(e.target.files?.[0])}
            />
          </label>
          {settings.logo_url && (
            <Button variant="secondary" onClick={removeLogo}>
              Remove
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save(form, 'Appearance saved')} loading={saving} disabled={saving}>
          Save Appearance
        </Button>
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() =>
            // Back to what is stored, not to the built-in defaults — the point
            // is to abandon an unsaved experiment.
            preview({
              primary_color: settings.primary_color ?? '#0f2d5c',
              secondary_color: settings.secondary_color ?? '#071e3d',
              accent_color: settings.accent_color ?? '#c9a227',
              font_family: settings.font_family ?? 'Roboto',
            })
          }
        >
          Discard Preview
        </Button>
      </div>
    </div>
  )
}
