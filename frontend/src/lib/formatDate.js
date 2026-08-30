/**
 * Dates arrive as ISO strings and are shown in the reader's own locale
 * rendering rather than the raw value. Null is the common case (nothing
 * scheduled yet), so it gets a real phrase instead of an empty cell.
 */
export function formatDateTime(value, { time = true, empty = 'Not scheduled' } = {}) {
  if (!value) return empty

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  // hour12 explicitly: en-GB defaults to a 24-hour clock, which doesn't
  // match the 12-hour times used elsewhere in the app and in the export.
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  })
}

/**
 * The value an <input type="datetime-local"> expects: local wall-clock time
 * with no zone. toISOString() would shift it by the UTC offset and show the
 * admin a different time than the one they saved.
 */
export function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * "2 min ago", "1 hr ago", "Yesterday, 11:42", "4 days ago".
 *
 * A relative time answers the question a notification list actually raises —
 * how long ago, and is this still current — where an absolute timestamp makes
 * the reader do the arithmetic. Anything older than a week falls back to a
 * date, because "37 days ago" is not a useful way to say a date.
 */
export function relativeTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hr${hours === 1 ? '' : 's'} ago`
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday - new Date(date).setHours(0, 0, 0, 0)) / 86400000)

  if (days === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
