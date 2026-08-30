import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import client from '../api/client'
import { Button } from './ui'
import DotSpinner from './DotSpinner'
import { formatFileSize } from '../lib/downloadDocument'

/**
 * Look at a document without downloading it first.
 *
 * Uploading and submitting are deliberately separate steps here, so between
 * them a student needs to answer one question: "is this actually the right
 * file?" Downloading it to their device to check is a poor way to ask that,
 * especially on a phone.
 *
 * The file is fetched as a blob through the ordinary API client rather than
 * pointed at with a src URL, because the download route is behind a bearer
 * token and an <iframe> cannot send an Authorization header.
 */

// Browsers render PDFs and images natively and nothing else — a .docx in an
// iframe is a download prompt or a page of mojibake, so we don't pretend.
function isPreviewable(document) {
  const type = document?.mime_type || ''
  return type === 'application/pdf' || type.startsWith('image/')
}

export default function DocumentPreview({ document: doc, label, onClose, onDownload }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  const previewable = isPreviewable(doc)

  // Escape closes, and the page behind must not scroll under the overlay. The
  // scroller is the content column rather than the document, so <body> is the
  // wrong thing to lock.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.document.addEventListener('keydown', onKey)

    const scroller = window.document.querySelector('[data-app-scroll]')
    const previous = scroller?.style.overflow
    if (scroller) scroller.style.overflow = 'hidden'

    // Focus moves into the dialog so Escape and Tab act on it, not on the
    // page still rendered behind.
    dialogRef.current?.focus()

    return () => {
      window.document.removeEventListener('keydown', onKey)
      if (scroller) scroller.style.overflow = previous ?? ''
    }
  }, [onClose])

  useEffect(() => {
    if (!doc || !previewable) return

    let objectUrl = null
    let cancelled = false

    client
      .get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        // The blob is retyped from the stored mime rather than trusting what
        // the response happened to guess: an octet-stream blob renders as a
        // download prompt instead of a document.
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }))
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('We couldn’t load this file. It may have been removed, or the server is unreachable.')
      })

    return () => {
      cancelled = true
      // Revoked on close, or the blob stays in memory for the whole session.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc, previewable])

  if (!doc) return null

  // Portalled to <body>: rendered in place, the overlay sits inside the app
  // shell, so its z-50 is scoped to that stacking context and the sticky app
  // bar and sidebar paint straight over the top of it — and "fixed" resolves
  // against the content column rather than the viewport, so the dialog is
  // centred on the wrong box and clipped.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={`Preview of ${doc.original_filename}`}
        className="flex h-full max-h-[88vh] outline-none w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-card-hover ring-1 ring-border"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {label && <p className="text-sm font-bold text-foreground">{label}</p>}
            <p className="truncate text-xs text-muted-foreground">
              {doc.original_filename} · {formatFileSize(doc.size_bytes)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" className="text-xs" onClick={() => onDownload(doc)}>
              Download
            </Button>
            <Button variant="secondary" className="text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-muted">
          {!previewable ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                This file can’t be previewed in the browser
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Word documents have no built-in browser viewer. Download it to check it, then come
                back and submit.
              </p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">Couldn’t open this file</p>
              <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            </div>
          ) : !url ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <DotSpinner size={44} />
              <p className="text-sm font-medium text-muted-foreground">Loading your document…</p>
            </div>
          ) : doc.mime_type?.startsWith('image/') ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={doc.original_filename} className="max-h-full max-w-full" />
            </div>
          ) : (
            <iframe src={url} title={`Preview of ${doc.original_filename}`} className="h-full w-full" />
          )}
        </div>
      </div>
    </div>,
    window.document.body
  )
}
