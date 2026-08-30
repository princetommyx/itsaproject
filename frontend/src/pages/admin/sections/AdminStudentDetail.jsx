import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
} from '../../../components/ui'
import { SkeletonCard } from '../../../components/Skeleton'
import { memberName } from '../../../lib/memberName'
import { formatDateTime } from '../../../lib/formatDate'

export default function AdminStudentDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { data: student, error: swrError, mutate } = useSWR(`/admin/students/${id}`)
  const isLoading = !student && !swrError

  const back = (
    <Link to="/admin/students" className="text-sm text-upsa-blue hover:underline">
      &larr; Back to students
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (swrError || !student) {
    return (
      <div className="space-y-6">
        {back}
        <Card>
          <ErrorState
            title="Couldn't load this student"
            description="They may have been removed, or the server couldn't be reached."
            onRetry={() => mutate()}
          />
        </Card>
      </div>
    )
  }

  const project = student.projects?.[0]

  return (
    <div className="space-y-6">
      {back}

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={student.name} className="h-16 w-16 text-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-slate-900">{student.name}</h1>
            <p className="text-sm font-medium text-slate-600">{student.university_id}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Email" value={student.student_email} />
          <Field
            label="Date of Birth"
            value={student.dob ? formatDateTime(student.dob, { time: false }) : null}
          />
          <Field
            label="Account Status"
            value={student.is_first_login ? 'Has not signed in yet' : 'Active'}
          />
          <Field label="Group" value={project?.title ?? 'Not in a group yet'} />
        </div>
      </Card>

      {project ? (
        <GroupCard project={project} />
      ) : (
        <AssignGroupCard student={student} onAssigned={() => mutate()} toast={toast} />
      )}
    </div>
  )
}

function GroupCard({ project }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-bold text-slate-900">{project.title}</h2>
        <Badge status={project.status} />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="Supervisor" value={project.assessor?.name ?? 'Unassigned'} />
        <Field label="Group Size" value={`${project.members?.length ?? 0} members`} />
        <Field label="Proposal Defense" value={formatDateTime(project.proposal_defense_at)} />
        <Field label="Project Defense" value={formatDateTime(project.final_defense_at)} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Group Members</p>
        <ul className="mt-2 divide-y divide-slate-100">
          {(project.members ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={memberName(m)} className="h-8 w-8 text-[11px]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{memberName(m)}</p>
                <p className="text-xs text-slate-500">{m.university_id}</p>
              </div>
              {m.is_leader && (
                <span className="ml-auto shrink-0 text-xs font-semibold text-upsa-blue">Leader</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <Link to={`/admin/projects/${project.id}`}>
          <Button variant="secondary">Open Project</Button>
        </Link>
      </div>
    </Card>
  )
}

/**
 * Groups normally form themselves, which leaves behind the students nobody
 * added — they can't create a group of their own without being a leader, and
 * no leader knows to add them. This is how an admin gets them in.
 */
function AssignGroupCard({ student, onAssigned, toast }) {
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)

  // /admin/groups, not /admin/projects: the latter hides drafts because it
  // backs the review list, and a group still short a member is almost always
  // a draft — exactly the ones this picker has to reach.
  const { data: projects, error: projectsError } = useSWR('/admin/groups')

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = projects ?? []
    if (!query) return list.slice(0, 8)

    return list.filter((p) => p.title.toLowerCase().includes(query)).slice(0, 8)
  }, [projects, search])

  async function assign(project) {
    setSaving(project.id)
    try {
      await client.post(`/admin/projects/${project.id}/members`, { student_id: student.id })
      toast.success(`${student.name} added to ${project.title}`, {
        description: 'They have been notified that they are now in this group.',
      })
      onAssigned()
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not add this student to the group', {
        description: message || 'Please try again.',
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Assign to a Group</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">
        {student.name} is not in a project group. Pick the group they belong to and they&apos;ll be
        added and notified.
      </p>

      <div className="mt-4">
        <Input
          label="Find a group"
          placeholder="Search by project topic"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4">
        {projectsError ? (
          <ErrorState title="Couldn't load the list of groups" />
        ) : !projects ? (
          <p className="py-4 text-sm font-medium text-slate-500">Loading groups…</p>
        ) : matches.length === 0 ? (
          <p className="py-4 text-sm font-medium text-slate-500">
            {search.trim() ? 'No group matches that topic.' : 'There are no project groups yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {matches.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{project.title}</p>
                  <p className="text-xs text-slate-500">
                    {project.members?.length ?? 0} member
                    {(project.members?.length ?? 0) !== 1 ? 's' : ''} ·{' '}
                    {project.assessor?.name ?? 'No supervisor yet'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  loading={saving === project.id}
                  disabled={saving !== null}
                  onClick={() => assign(project)}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
