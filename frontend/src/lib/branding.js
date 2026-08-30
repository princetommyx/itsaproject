/**
 * Applying the institution's branding, and doing it before the first paint.
 *
 * The settings that decide how the app looks live on the server, so they only
 * arrive after a request. Left at that, every sign-in renders once in the
 * built-in navy and then visibly repaints into the institution's colours.
 * The last known branding is cached here and applied synchronously at boot,
 * so the first frame is already right and the fetch only ever confirms it.
 */

const CACHE_KEY = 'fyp_branding'
const THEME_KEY = 'fyp_theme'
const FONT_LINK_ID = 'admin-font'

/**
 * The fonts an administrator can pick from.
 *
 * A fixed list rather than a free-text field: the face has to be fetched from
 * Google Fonts to render at all, so an arbitrary name would silently fall back
 * to the system stack with no explanation.
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

/** Only the keys that change how the app looks are worth caching. */
const BRANDING_KEYS = [
  'primary_color',
  'secondary_color',
  'accent_color',
  'font_family',
  'logo_url',
  'school_name',
  'short_name',
]

export function applyBranding(settings) {
  if (!settings) return

  const root = document.documentElement
  const tokens = {
    // --brand is the token the design system is built on: the sidebar
    // gradient, primary buttons, links, focus rings and the active nav pill
    // all resolve through it, so one write re-skins the app.
    '--brand': settings.primary_color,
    '--brand-2': settings.secondary_color,
    '--accent-gold': settings.accent_color,
  }

  for (const [token, value] of Object.entries(tokens)) {
    if (value) root.style.setProperty(token, value)
  }

  const font = FONT_OPTIONS.find((f) => f.name === settings.font_family)
  if (font) {
    // --app-font, not --font-sans: the theme declares
    // `--font-sans: var(--app-font, <default stack>)`, so an unknown font
    // falls back rather than leaving the app with no font at all.
    root.style.setProperty('--app-font', font.stack)

    // One reused link element, so switching fonts replaces the request rather
    // than stacking a stylesheet for every font ever previewed.
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

export function cacheBranding(settings) {
  if (!settings) return

  try {
    const subset = {}
    for (const key of BRANDING_KEYS) {
      if (settings[key] !== undefined) subset[key] = settings[key]
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(subset))
  } catch {
    // Private browsing can refuse writes. The only cost is one repaint on the
    // next visit, which is where this started.
  }
}

export function readCachedBranding() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Run before React mounts. Paints the cached branding and theme onto the
 * document so the first frame is already correct.
 */
export function bootTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    const dark =
      saved === 'dark' ||
      ((saved === 'system' || !saved) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch {
    // Falls through to the light default already in the stylesheet.
  }

  applyBranding(readCachedBranding())
}

/**
 * ToastMagic's runtime reads its configuration from globals at load, and its
 * dark palette is keyed on `body[theme="dark"]` rather than on the class our
 * own tokens use. Both are set here so the toasts match the app.
 *
 * Called before React mounts, and again whenever the theme changes.
 */
export function applyToastTheme(dark) {
  document.body.setAttribute('theme', dark ? 'dark' : 'light')

  window.toastMagicConfig = {
    ...(window.toastMagicConfig ?? {}),
    theme: 'minimal',
    positionClass: 'toast-top-end',
    color_mode: false,
  }

  // Point the toast palette at our own tokens, so a toast is the same green
  // and red as the rest of the app rather than the package's defaults — and
  // so it follows an administrator's brand colour along with everything else.
  const styles = getComputedStyle(document.documentElement)
  const token = (name) => styles.getPropertyValue(name).trim()

  window.toastMagicStyleVars = {
    '--toast-magic-success': token('--success'),
    '--toast-magic-danger': token('--destructive'),
    '--toast-magic-warning': token('--warning'),
    '--toast-magic-info': token('--brand-ink'),
    '--toast-item-bg': token('--card'),
    '--toast-item-color': token('--card-foreground'),
    '--toast-close-btn-color': token('--muted-foreground'),
    '--toast-custom-btn-color': token('--brand-ink'),
  }
}
