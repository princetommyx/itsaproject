const METER_STYLES = {
  // The validated status palette. Track is the same hue at low alpha so the
  // bar reads as an empty channel rather than a slab, in either theme.
  //
  // No text colour here on purpose: a mark colour chosen to sit on a surface
  // is not chosen to be read as small text, and these fell to 3.8:1 when they
  // were. The bar carries identity; the number wears ordinary ink.
  awaiting: { fill: 'bg-chart-awaiting', track: 'bg-chart-awaiting/20' },
  review: { fill: 'bg-chart-review', track: 'bg-chart-review/20' },
  approved: { fill: 'bg-chart-approved', track: 'bg-chart-approved/20' },
  refine: { fill: 'bg-chart-refine', track: 'bg-chart-refine/20' },
}

/**
 * Project counts by status, as meter rows.
 *
 * Four fixed categories with a label and a printed value on every row, so the
 * colour reinforces identity rather than carrying it — no chart library, and
 * nothing that depends on telling two hues apart.
 *
 * Bars are scaled to the largest value rather than the total: with four
 * statuses that are often lopsided, scaling to the sum leaves every bar a
 * sliver and the comparison unreadable.
 */
export default function StatusBreakdownChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const total = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <div className="space-y-3.5">
      {rows.map((row) => {
        const style = METER_STYLES[row.variant] ?? METER_STYLES.review
        const pct = (row.value / max) * 100
        const share = total > 0 ? Math.round((row.value / total) * 100) : 0

        return (
          <div
            key={row.label}
            className="flex items-center gap-3"
            title={`${row.label}: ${row.value} of ${total} (${share}%)`}
          >
            <span className="w-36 shrink-0 truncate text-[13px] font-semibold text-foreground">
              {row.label}
            </span>
            <div className={`h-2 flex-1 overflow-hidden rounded-full ${style.track}`}>
              {/* Rounded on both ends and anchored at the baseline, so a small
                  value still reads as a mark rather than a stray dot. */}
              <div
                className={`h-full rounded-full transition-all duration-500 ${style.fill}`}
                style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
              {row.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
