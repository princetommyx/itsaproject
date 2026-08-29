// Mirrors ProjectDocument::TYPES on the backend — keep the keys in sync.
// Only two documents are submitted through the system: the topic proposal
// that goes for approval, and the completed project work that follows once
// the topic is approved.
export const DOCUMENT_TYPES = [
  { key: 'proposal', label: 'Project Proposal' },
  { key: 'final_report', label: 'Final Project Work Document' },
]

export const DOCUMENT_TYPE_LABELS = Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.key, t.label]))

// The dashboard's submission checklist. Derived rather than listed
// separately so it can't drift out of sync with DOCUMENT_TYPES — both
// documents are required, so the checklist is simply all of them.
export const CORE_SUBMISSION_TYPES = DOCUMENT_TYPES.map((t) => t.key)
