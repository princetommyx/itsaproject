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
