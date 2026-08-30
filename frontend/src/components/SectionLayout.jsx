import { Card } from './ui'
import { cn } from '../lib/cn'

/**
 * A settings-style page: a rail of sections down the left, the selected one
 * beside it.
 *
 * Both this app's settings-shaped pages used a row of tabs, which stops
 * working once there are more than about four: the labels either wrap or
 * scroll sideways, and either way you can no longer see the whole set at a
 * glance. A vertical rail shows every section at once, has room for an icon,
 * and grows without redesigning anything.
 *
 * Below lg there is no room for a rail, so it becomes a horizontal scroller —
 * which is the tab row, but only where a tab row is the better shape.
 */
export default function SectionLayout({ sections, active, onSelect, children, aside }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <nav
        aria-label="Sections"
        className="lg:sticky lg:top-0 lg:w-56 lg:shrink-0"
      >
        <Card className="p-2 max-lg:overflow-x-auto max-lg:p-1.5">
          <ul className="flex gap-1 max-lg:min-w-max lg:flex-col">
            {sections.map((section) => {
              const isActive = section.key === active
              const Icon = section.icon

              return (
                <li key={section.key} className="shrink-0">
                  <button
                    onClick={() => onSelect(section.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition',
                      isActive
                        ? 'bg-brand/10 text-brand-ink'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon size={18} />}
                    {section.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        {aside && <div className="mt-4 max-lg:hidden">{aside}</div>}
      </nav>

      <div key={active} className="animate-fade-up min-w-0 flex-1 space-y-5">
        {children}
      </div>
    </div>
  )
}

/**
 * A card with a heading, a line of explanation, and its primary action on the
 * same row — so the button that saves a section sits with the section rather
 * than at the bottom of a scroll.
 */
export function SectionCard({ title, description, action, children, className = '' }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  )
}

/** The two-column form grid the reference uses, collapsing to one on mobile. */
export function FieldGrid({ children, className = '' }) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2', className)}>
      {children}
    </div>
  )
}

/**
 * The identity block at the top of a profile: avatar, name, role.
 *
 * No "change photo" control, because there is nowhere to put a photo — the
 * accounts come from the university's roster import and carry no avatar field.
 * Offering the control and having it do nothing would be worse than not
 * offering it.
 */
export function IdentityHeader({ avatar, name, subtitle, meta }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-foreground">{name}</p>
        {subtitle && <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>}
        {meta && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{meta}</p>}
      </div>
    </div>
  )
}
