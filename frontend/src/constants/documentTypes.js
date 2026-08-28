// Mirrors ProjectDocument::TYPES on the backend — keep the keys in sync.
export const DOCUMENT_TYPES = [
  { key: 'proposal', label: 'Project Proposal' },
  { key: 'chapter_1', label: 'Chapter 1' },
  { key: 'chapter_2', label: 'Chapter 2' },
  { key: 'chapter_3', label: 'Chapter 3' },
  { key: 'chapter_4', label: 'Chapter 4' },
  { key: 'chapter_5', label: 'Chapter 5' },
  { key: 'final_report', label: 'Final Report' },
  { key: 'presentation', label: 'Presentation Slides' },
  { key: 'source_code', label: 'Source Code / ZIP' },
  { key: 'supporting', label: 'Supporting Document' },
]

export const DOCUMENT_TYPE_LABELS = Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.key, t.label]))

// The checklist shown on the student dashboard only tracks the core,
// expected submissions — not every optional/supporting type.
export const CORE_SUBMISSION_TYPES = ['proposal', 'chapter_1', 'chapter_2', 'final_report']
