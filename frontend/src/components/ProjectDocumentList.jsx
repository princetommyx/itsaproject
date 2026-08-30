import { useState } from 'react'
import { downloadDocument, formatFileSize } from '../lib/downloadDocument'
import { DOCUMENT_TYPE_LABELS } from '../constants/documentTypes'
import { Button } from './ui'

/**
 * Read-only submitted-documents list for reviewers (assessor/admin) —
 * grouped by type, most recent first, download-only (no upload/delete).
 */
export default function ProjectDocumentList({ documents }) {
  const [downloadingId, setDownloadingId] = useState(null)

  if (!documents || documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents have been submitted yet.</p>
  }

  const byType = {}
  for (const doc of documents) {
    byType[doc.type] ??= []
    byType[doc.type].push(doc)
  }

  async function handleDownload(doc) {
    setDownloadingId(doc.id)
    try {
      await downloadDocument(doc)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <ul className="divide-y divide-border">
      {Object.entries(byType).map(([type, versions]) => {
        const current = versions[0]
        return (
          <li key={type} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{DOCUMENT_TYPE_LABELS[type] || type}</p>
              <p className="truncate text-xs text-muted-foreground">
                {current.original_filename} · {formatFileSize(current.size_bytes)} ·{' '}
                {new Date(current.created_at).toLocaleDateString()}
                {versions.length > 1 && ` · ${versions.length} versions`}
              </p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0 text-xs"
              onClick={() => handleDownload(current)}
              disabled={downloadingId === current.id}
              loading={downloadingId === current.id}
            >
              Download
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
