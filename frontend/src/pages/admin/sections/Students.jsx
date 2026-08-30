import { useState } from 'react'
import useSWR from 'swr'
import { Avatar, Badge, Card, EmptyState, ErrorState, Input, PageHeading } from '../../../components/ui'
import { SkeletonTable } from '../../../components/Skeleton'
import { UsersIcon } from '../../../components/icons'

export default function Students() {
  const [search, setSearch] = useState('')

  // Search runs server-side so it covers the whole roster, not just the page
  // currently loaded. Trimmed so a stray space doesn't fetch a new key.
  const query = search.trim()
  const { data, error: swrError, mutate } = useSWR(
    `/admin/students${query ? `?search=${encodeURIComponent(query)}` : ''}`
  )
  const students = data?.data ?? []
  const isLoading = !data && !swrError

  return (
    <div className="space-y-6">
      <PageHeading description="Every student account created from an imported roster.">
        Students
      </PageHeading>

      <Card>
        <Input
          label="Search"
          placeholder="Search by name or index number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mt-5">
          {swrError ? (
            <ErrorState
              title="Couldn't load students"
              description="The student roster didn't load. Check your connection and try again."
              onRetry={() => mutate()}
            />
          ) : isLoading ? (
            <SkeletonTable rows={6} cols={3} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={query ? 'No students match that search' : 'No students yet'}
              description={
                query
                  ? 'Try a different name or index number.'
                  : 'Import a student roster and the accounts will appear here.'
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((student) => {
                const project = student.projects?.[0]

                return (
                  <li key={student.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                    <Avatar name={student.name} className="mt-0.5 h-9 w-9 shrink-0 text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        {/* Until a student first signs in they still hold the
                            date-of-birth password the import generated, so
                            flagging that is the useful status here. */}
                        {student.is_first_login ? (
                          <span className="text-xs font-semibold text-amber-700">Not signed in yet</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">Active</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-600">{student.university_id}</p>
                      {student.student_email && (
                        <p className="truncate text-xs text-slate-500">{student.student_email}</p>
                      )}
                      <div className="mt-1.5">
                        {project ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-xs text-slate-500">{project.title}</span>
                            <Badge status={project.status} />
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not in a project group yet</span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
