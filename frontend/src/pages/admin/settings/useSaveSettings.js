import { useState } from 'react'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { useSettings } from '../../../context/SettingsContext'

/**
 * Saving is the same everywhere on this page: PUT the changed keys, then write
 * what came back into both caches.
 *
 * No re-read afterwards. The response already carries every setting, and
 * fetching them again made the save button sit in its loading state across two
 * round trips instead of one — which is what made saving appearance feel slow.
 */
export function useSaveSettings(onSaved) {
  const toast = useToast()
  const { applySaved } = useSettings()
  const [saving, setSaving] = useState(false)

  async function save(values, successMessage = 'Settings saved') {
    setSaving(true)
    try {
      const { data } = await client.put('/admin/settings', values)
      onSaved?.(data)
      applySaved(data.settings)
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
