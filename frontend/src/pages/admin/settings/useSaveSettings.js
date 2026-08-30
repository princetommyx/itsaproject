import { useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { useSettings } from '../../../context/SettingsContext'

/**
 * Saving is the same everywhere on this page: PUT the changed keys, write the
 * response back into the cache, and re-read the branding so a colour or font
 * change is visible immediately rather than after a reload.
 */
export function useSaveSettings(onSaved) {
  const toast = useToast()
  const { refresh } = useSettings()
  const [saving, setSaving] = useState(false)

  async function save(values, successMessage = 'Settings saved') {
    setSaving(true)
    try {
      const { data } = await client.put('/admin/settings', values)
      onSaved?.(data)
      await refresh()
      toast.success(successMessage)
      return true
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not save these settings', { description: message || 'Please try again.' })
      return false
    } finally {
      setSaving(false)
    }
  }

  return { save, saving }
}
