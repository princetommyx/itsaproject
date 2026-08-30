/**
 * Turn an axios failure into something a person can act on.
 *
 * The pattern this replaces — `err.response?.data?.message || 'Could not do
 * the thing.'` — collapses three very different failures into one sentence.
 * A request that never reached the server (offline, CORS, DNS, a timeout, a
 * gateway returning HTML) has no `response` at all, so it falls through to
 * the same wording as a rejected-but-answered request. That reads as "the
 * server considered this and said no", which sends everyone looking in the
 * wrong place.
 */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) {
    return 'Could not reach the server — the request never completed, so nothing was changed. Check your connection, or the API may be down or blocking this site.'
  }

  const { status, data } = err.response

  if (data?.message) return data.message

  // Laravel validation payloads carry the detail under `errors`, not `message`.
  if (data?.errors) {
    const flat = Object.values(data.errors).flat().filter(Boolean)
    if (flat.length) return flat.join(' ')
  }

  // A 5xx with no JSON body is usually a gateway or crash returning HTML.
  // Naming the status is what makes it reportable.
  if (status >= 500) {
    return `The server failed while handling this request (HTTP ${status}). Nothing was changed — please try again, and report this if it keeps happening.`
  }

  return `${fallback} (HTTP ${status})`
}
