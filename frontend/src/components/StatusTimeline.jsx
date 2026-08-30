const STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted_unassigned', label: 'Submitted' },
  { key: 'pending', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
]

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l4 4 8-8" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3l8 14H2L10 3Z" />
      <path d="M10 8.5v3.5M10 15h.01" />
    </svg>
  )
}

/**
 * A stepper derived entirely from the project's real `status` enum — no
 * fabricated milestones or dates. `refine` is shown as a detour on the
 * "Under Review" step rather than its own stage, since that's literally
 * what it is: the project bounced back from review for changes.
 */
export default function StatusTimeline({ status }) {
  const isRefine = status === 'refine'
  // A refined project is mid-way between "Under Review" and back to
  // editing — treat it as sitting at the review step for index purposes.
  const effectiveStatus = isRefine ? 'pending' : status
  const currentIndex = STAGES.findIndex((s) => s.key === effectiveStatus)

  return (
    <div className="flex items-start">
      {STAGES.map((stage, i) => {
        const isRefineHere = isRefine && i === currentIndex
        // The final stage ("Approved") is a terminal, fully-done state, not
        // an in-progress "current" one — show it as completed too.
        const isCompleted = (i < currentIndex || (i === currentIndex && i === STAGES.length - 1)) && !isRefineHere
        const isCurrent = i === currentIndex && !isCompleted

        return (
          <div key={stage.key} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-white transition ${
                  isRefineHere
                    ? 'border-amber-400 bg-amber-400'
                    : isCompleted
                      ? 'border-brand bg-brand'
                      : isCurrent
                        ? 'border-brand bg-card text-brand'
                        : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {isRefineHere ? <WarningIcon /> : isCompleted ? <CheckIcon /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </div>
              <p
                className={`mt-1.5 max-w-[5.5rem] text-center text-[11px] leading-tight font-medium ${
                  isRefineHere ? 'text-amber-600' : isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {isRefineHere ? 'Needs Refinement' : stage.label}
              </p>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`mt-3.5 h-0.5 flex-1 ${i < currentIndex ? 'bg-brand' : 'bg-accent'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
