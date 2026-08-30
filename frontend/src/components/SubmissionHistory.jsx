import { Link } from 'react-router-dom'
import { Badge } from './ui'
import { formatDateTime } from '../lib/formatDate'

const STAGE_LABELS = {
  proposal: 'Project Proposal',
  final: 'Final Project Work',
}

/**
 * The submission history as a vertical timeline, newest first.
 *
 * Every version stays here permanently — including the ones that were sent
 * back, which are the whole point: without them there is no way to check
 * whether a resubmission actually answered the feedback.
 *
 * `compareBase` turns the Compare action on for reviewers. Students get the
 * same history without it, since comparing is a review activity.
 */
export default function SubmissionHistory({ versions = [], compareBase = null }) {
  if (versions.length === 0) {
    return <p className="text-sm font-medium text-slate-500">No submissions yet.</p>
  }

  const ordered = [...versions].sort((a, b) =>
    a.stage === b.stage ? b.sequence - a.sequence : a.stage === 'final' ? -1 : 1
  )
  const showStage = new Set(versions.map((v) => v.stage)).size > 1

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
      {ordered.map((version, i) => (
        <li key={version.id} className="relative">
          <span
            className={`absolute top-1.5 -left-[26px] h-3 w-3 rounded-full ring-4 ring-white ${
              i === 0 ? 'bg-upsa-blue' : 'bg-slate-300'
            }`}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-sm font-bold text-slate-900">{version.label}</span>
            <Badge status={version.status} />
            {i === 0 && (
              <span className="text-xs font-semibold text-upsa-blue">Current</span>
            )}
          </div>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {showStage && <span>{STAGE_LABELS[version.stage] ?? version.stage} · </span>}
            {version.submitted_at
              ? `Submitted ${formatDateTime(version.submitted_at, { empty: '' })}`
              : 'Not submitted yet'}
            {version.submitter?.name && ` by ${version.submitter.name}`}
          </p>

          {version.feedback && (
            <p className="mt-1.5 rounded-lg bg-pink-50 px-3 py-2 text-xs font-medium text-pink-800">
              {version.feedback}
            </p>
          )}

          {compareBase && version.sequence > 1 && (
            <Link
              to={`${compareBase}?current=${version.id}`}
              className="mt-2 inline-block text-xs font-semibold text-upsa-blue hover:underline"
            >
              Compare with previous version
            </Link>
          )}
        </li>
      ))}
    </ol>
  )
}
