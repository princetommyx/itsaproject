import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyToastTheme, THEME_KEY } from '../lib/branding'

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, resolved: 'light' })

/**
 * Light / dark / follow-the-system.
 *
 * Stored per browser rather than per account: it's a property of the device
 * you're reading on — a phone in bright sun and a lab machine at night want
 * different answers from the same user.
 */
function readStored() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  } catch {
    // Private browsing can throw on access; falling back to the system
    // preference is the right default anyway.
    return 'system'
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handle = (event) => setSystemDark(event.matches)
    query.addEventListener('change', handle)
    return () => query.removeEventListener('change', handle)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    // The token sets are keyed on a `dark` class, matching the template's
    // custom variant, so the whole palette swaps from this one line. main.jsx
    // has already applied the stored choice before the first paint; this keeps
    // it in step with every change after that.
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.style.colorScheme = resolved

    // ToastMagic keys its dark palette on body[theme] and reads its colours
    // from globals, so it has to be told separately.
    applyToastTheme(resolved === 'dark')
  }, [resolved])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Not being able to remember the choice is survivable; applying it now
      // is the part that matters.
    }
  }, [])

  /**
   * Forget the choice and go back to following the system.
   *
   * Called on sign-out. This is a website on a possibly shared browser, not an
   * installed app with an account behind it: the next person to reach the
   * login page should not inherit whatever the last one picked.
   */
  const resetTheme = useCallback(() => {
    setThemeState('system')
    try {
      localStorage.removeItem(THEME_KEY)
    } catch {
      // Nothing stored means nothing to forget; the state reset above is what
      // actually changes the screen.
    }
  }, [])

  const value = useMemo(
    () => ({ theme, resolved, setTheme, resetTheme }),
    [theme, resolved, setTheme, resetTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
