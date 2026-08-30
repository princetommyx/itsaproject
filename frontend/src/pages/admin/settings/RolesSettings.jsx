import { useState } from 'react'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Button, Card, ErrorState, Input, Textarea } from '../../../components/ui'
import { SkeletonCard } from '../../../components/Skeleton'

const BASE_ROLES = [
  { key: 'admin', label: 'Administration', hint: 'Lands in the admin area.' },
  { key: 'assessor', label: 'Assessor', hint: 'Lands in the assessor area.' },
  { key: 'student', label: 'Student', hint: 'Lands in the student area.' },
]

const EMPTY = { name: '', description: '', base_role: 'admin', permissions: [] }

/**
 * The permission builder.
 *
 * Roles are the institution's business — one school has project
 * coordinators, another has external examiners — so they're defined here
 * rather than shipped as a fixed list. The permissions themselves stay in
 * code, because each one guards a capability that has to exist to be
 * guarded, and the server sends the catalogue with the roles so this page
 * can't drift out of step with what actually exists.
 */
export default function RolesSettings() {
  const toast = useToast()
  const { data, error: swrError, mutate } = useSWR('/admin/roles')
  const [editing, setEditing] = useState(null)

  if (swrError) {
    return (
      <Card>
        <ErrorState
          title="Couldn't load roles"
          description="We couldn't reach the server. Check your connection and try again."
          onRetry={() => mutate()}
        />
      </Card>
    )
  }

  if (!data) return <SkeletonCard lines={5} />

  const { roles, catalogue } = data

  async function remove(role) {
    try {
      const { data: result } = await client.delete(`/admin/roles/${role.id}`)
      toast.success('Role deleted', { description: result.message })
      mutate()
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not delete this role', { description: message || 'Please try again.' })
    }
  }

  if (editing) {
    return (
      <RoleEditor
        role={editing}
        catalogue={catalogue}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          mutate()
        }}
        toast={toast}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Roles</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Define the roles your institution actually uses, and choose exactly what each one can
              do.
            </p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}>New Role</Button>
        </div>

        <ul className="mt-5 divide-y divide-border">
          {roles.map((role) => (
            <li key={role.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{role.name}</p>
                  {role.is_system && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      Built-in
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">{role.description}</p>
                )}
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {role.permissions?.length ?? 0} permission
                  {(role.permissions?.length ?? 0) !== 1 ? 's' : ''} · {role.users_count} user
                  {role.users_count !== 1 ? 's' : ''} · {role.base_role} area
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => setEditing(role)}>
                  Edit
                </Button>
                {!role.is_system && (
                  <Button variant="danger" onClick={() => remove(role)}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <AssignRoles roles={roles} toast={toast} />
    </div>
  )
}

function RoleEditor({ role, catalogue, onCancel, onSaved, toast }) {
  const [form, setForm] = useState({
    name: role.name ?? '',
    description: role.description ?? '',
    base_role: role.base_role ?? 'admin',
    permissions: role.permissions ?? [],
  })
  const [saving, setSaving] = useState(false)

  const isNew = !role.id

  function toggle(permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(permission)
        ? f.permissions.filter((p) => p !== permission)
        : [...f.permissions, permission],
    }))
  }

  function toggleGroup(keys, allOn) {
    setForm((f) => ({
      ...f,
      permissions: allOn
        ? f.permissions.filter((p) => !keys.includes(p))
        : [...new Set([...f.permissions, ...keys])],
    }))
  }

  async function submit() {
    setSaving(true)
    try {
      if (isNew) await client.post('/admin/roles', form)
      else await client.put(`/admin/roles/${role.id}`, form)
      toast.success(isNew ? 'Role created' : 'Role updated')
      onSaved()
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not save this role', { description: message || 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold text-foreground">{isNew ? 'New Role' : `Edit ${role.name}`}</h2>

        <div className="mt-5 space-y-5">
          <Input
            label="Role Name"
            placeholder="e.g. Project Coordinator"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={2}
            placeholder="What this role is for."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Area</span>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Which part of the system holders of this role work in. This can&apos;t be changed for
              built-in roles.
            </p>
            <div className="flex flex-wrap gap-2">
              {BASE_ROLES.map((base) => (
                <button
                  key={base.key}
                  type="button"
                  disabled={role.is_system}
                  onClick={() => setForm((f) => ({ ...f, base_role: base.key }))}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    form.base_role === base.key
                      ? 'bg-brand text-white'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {base.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-bold text-foreground">Permissions</h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {form.permissions.length} selected.
        </p>

        <div className="mt-5 space-y-6">
          {Object.entries(catalogue).map(([group, permissions]) => {
            const keys = Object.keys(permissions)
            const allOn = keys.every((k) => form.permissions.includes(k))

            return (
              <div key={group}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{group}</p>
                  <button
                    type="button"
                    onClick={() => toggleGroup(keys, allOn)}
                    className="text-xs font-semibold text-brand-ink hover:underline"
                  >
                    {allOn ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(permissions).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(key)}
                        onChange={() => toggle(key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-upsa-blue"
                      />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} loading={saving} disabled={saving || !form.name.trim()}>
          {isNew ? 'Create Role' : 'Save Role'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/**
 * Give a specific person a role. Only staff are listed: students all do the
 * same thing, and a per-student role would be a way to quietly strip one
 * student's ability to submit.
 */
function AssignRoles({ roles, toast }) {
  const { data: staff, error, mutate } = useSWR('/admin/staff')
  const [saving, setSaving] = useState(null)

  if (error) return null
  if (!staff) return <SkeletonCard lines={3} />

  async function assign(user, roleId) {
    setSaving(user.id)
    try {
      await client.put(`/admin/users/${user.id}/role`, { role_id: roleId || null })
      toast.success(`${user.name}'s role updated`)
      mutate()
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not change this role', { description: message || 'Please try again.' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-foreground">Who Has Which Role</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        A staff member with no role assigned keeps the default permissions for their area.
      </p>

      <ul className="mt-5 divide-y divide-border">
        {staff.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {user.email} · {user.role}
              </p>
            </div>
            <select
              disabled={saving === user.id}
              value={user.role_id ?? ''}
              onChange={(e) => assign(user, e.target.value ? Number(e.target.value) : null)}
              className="w-full shrink-0 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-ring/60 focus:border-brand-ink focus:ring-4 focus:ring-ring/25 focus:outline-none sm:w-56"
            >
              <option value="">Default permissions</option>
              {roles
                .filter((r) => r.base_role === user.role)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </li>
        ))}
      </ul>
    </Card>
  )
}
