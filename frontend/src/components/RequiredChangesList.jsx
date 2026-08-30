/**
 * The reviewer's actionable checklist, kept apart from the prose feedback so
 * a student can work through it item by item instead of re-reading a
 * paragraph to find what they still owe.
 */
export default function RequiredChangesList({ items = [], className = '' }) {
  if (!items?.length) return null

  return (
    <div className={className}>
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Required Changes</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm font-medium text-foreground">
            <span
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
