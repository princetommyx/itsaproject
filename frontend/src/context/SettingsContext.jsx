import { createContext, useContext, useEffect, useMemo } from 'react'
import useSWR from 'swr'

const SettingsContext = createContext({ settings: {}, isLoading: true })

/**
 * The fonts an administrator can pick from.
 *
 * A fixed list rather than a free-text field: the face has to be fetched from
 * Google Fonts to render at all, so an arbitrary name would simply fall back
 * to the system stack with no explanation. Each entry names a real family and
 * the stack to fall back to while it loads.
 */
export const FONT_OPTIONS = [
  { name: 'Roboto', weights: '400;500;700;900', stack: "'Roboto', Arial, Helvetica, sans-serif" },
  { name: 'Inter', weights: '400;500;600;700;800', stack: "'Inter', system-ui, sans-serif" },
  { name: 'Open Sans', weights: '400;500;600;700;800', stack: "'Open Sans', Arial, sans-serif" },
  { name: 'Lato', weights: '400;700;900', stack: "'Lato', Arial, sans-serif" },
  { name: 'Source Sans 3', weights: '400;500;600;700', stack: "'Source Sans 3', Arial, sans-serif" },
  { name: 'Nunito Sans', weights: '400;600;700;800', stack: "'Nunito Sans', Arial, sans-serif" },
  { name: 'Work Sans', weights: '400;500;600;700', stack: "'Work Sans', Arial, sans-serif" },
  { name: 'IBM Plex Sans', weights: '400;500;600;700', stack: "'IBM Plex Sans', Arial, sans-serif" },
]

const FONT_LINK_ID = 'admin-font'

/**
 * Applies the institution's branding to the running app.
 *
 * The colours are Tailwind theme tokens, which compile to custom properties
 * on :root — so setting them inline on the root element overrides the
 * stylesheet without rebuilding anything, and every utility that references
 * them follows in one step.
 */
function applyTheme(settings) {
  if (!settings) return

  const root = document.documentElement
  const map = {
    // --brand is the token the whole design system is built on: the sidebar
    // gradient, primary buttons, links, focus rings and the active nav pill
    // all resolve through it, so one write re-skins the app.
    '--brand': settings.primary_color,
    '--brand-2': settings.secondary_color,
    '--accent-gold': settings.accent_color,
  }

  for (const [token, value] of Object.entries(map)) {
    if (value) root.style.setProperty(token, value)
  }

  const font = FONT_OPTIONS.find((f) => f.name === settings.font_family)
  if (font) {
    // --app-font, not --font-sans directly: the theme declares
    // `--font-sans: var(--app-font, <default stack>)`, so an unset or unknown
    // font falls back rather than leaving the app with no font at all.
    root.style.setProperty('--app-font', font.stack)

    // The face has to be fetched before it can render. One reused link
    // element, so switching fonts replaces the request rather than stacking
    // up a new stylesheet for every font ever previewed.
    let link = document.getElementById(FONT_LINK_ID)
    if (!link) {
      link = document.createElement('link')
      link.id = FONT_LINK_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name).replace(/%20/g, '+')}:wght@${font.weights}&display=swap`
    if (link.href !== href) link.href = href
  }

  if (settings.school_name) document.title = `${settings.school_name} — FYP System`
}

export function SettingsProvider({ children }) {
  // Available to every signed-in user, because the app cannot render in the
  // institution's colours without it. Revalidation is off: branding changes
  // perhaps twice a year and refetching it on every window focus is noise.
  const { data, error, mutate } = useSWR('/settings', {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })

  useEffect(() => {
    applyTheme(data)
  }, [data])

  const value = useMemo(
    () => ({ settings: data ?? {}, isLoading: !data && !error, refresh: mutate, applyTheme }),
    [data, error, mutate]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
