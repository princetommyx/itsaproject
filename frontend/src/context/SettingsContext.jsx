import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { applyBranding, cacheBranding, readCachedBranding } from '../lib/branding'

export { FONT_OPTIONS } from '../lib/branding'

const SettingsContext = createContext({ settings: {}, isLoading: true })

export function SettingsProvider({ children }) {
  // Available to every signed-in user, because the app cannot render in the
  // institution's colours without it. Seeded from the cache main.jsx already
  // painted, so there is no window where the app knows less than the screen
  // is showing. Revalidation is off: branding changes perhaps twice a year.
  const { data, error, mutate } = useSWR('/settings', {
    fallbackData: readCachedBranding() ?? undefined,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })

  useEffect(() => {
    applyBranding(data)
    cacheBranding(data)
  }, [data])

  /**
   * Write settings the server has just confirmed straight into the cache.
   *
   * A save used to follow its PUT with a re-read, and the button stayed in its
   * loading state across both — two round trips to learn what the first one
   * already returned.
   */
  const applySaved = useCallback(
    (settings) => mutate(settings, { revalidate: false }),
    [mutate]
  )

  const value = useMemo(
    () => ({
      settings: data ?? {},
      isLoading: !data && !error,
      refresh: mutate,
      applySaved,
      applyTheme: applyBranding,
    }),
    [data, error, mutate, applySaved]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
