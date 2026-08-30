const METER_STYLES = {
  // Tracks are a tint of the fill rather than a fixed light step, so the bar
  // still reads as an empty channel on a dark card instead of a white slab.
  gold: { track: 'bg-amber-500/20', fill: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  blue: { track: 'bg-blue-500/20', fill: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  violet: { track: 'bg-violet-500/20', fill: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
  pink: { track: 'bg-pink-500/20', fill: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300' },
}

/**
 * A simple meter-row breakdown of real project counts by status (from
 * /admin/dashboard) — no fabricated data, no chart library needed for
 * four fixed categories.
 */
export default function StatusBreakdownChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const style = METER_STYLES[row.variant] || METER_STYLES.blue
        const pct = (row.value / max) * 100

        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-[13px] font-semibold text-foreground">{row.label}</span>
            <div className={`h-2 flex-1 overflow-hidden rounded-full ${style.track}`}>
              <div
                className={`h-full rounded-full ${style.fill} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`w-6 shrink-0 text-right text-sm font-semibold tabular-nums ${style.text}`}>
              {row.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
