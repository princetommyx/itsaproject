import { useMemo, useState } from 'react'
import useSWR from 'swr'
import client from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { Button, EmptyState, ErrorState, Input, Textarea } from '../../../components/ui'
import { FieldGrid, SectionCard } from '../../../components/SectionLayout'
import { SkeletonList } from '../../../components/Skeleton'
import { EditIcon, SearchIcon, ShieldIcon } from '../../../components/icons'
import { cn } from '../../../lib/cn'

/**
 * The permission catalogue: every capability the system can grant, what it
 * means, and which roles hold it.
 *
 * Permissions are not rows an administrator creates — each key is checked by
 * a route, so the set is fixed by the code. What an institution can change is
 * how each one is worded to whoever is building a role, which is what the
 * editor here does.
 */
export default function PermissionsCatalogue() {
  const toast = useToast()
  const { data, error: swrError, mutate } = useSWR('/admin/permissions')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)


  const matches = useMemo(() => {
    // Off data.permissions rather than a defaulted copy: `?? []` builds a new
    // array on every render, so the memo below it would never hit.
    const all = data?.permissions ?? []
    const query = search.trim().toLowerCase()
    if (!query) return all

    return all.filter((p) =>
      [p.name, p.description, p.key, p.group].filter(Boolean).join(' ').toLowerCase().includes(query)
    )
  }, [data?.permissions, search])

  // Grouped the way the catalogue is defined, so the list reads in the shape
  // of the system rather than as one flat run of twenty-one rows.
  const grouped = useMemo(() => {
    const byGroup = new Map()
    for (const permission of matches) {
      if (!byGroup.has(permission.group)) byGroup.set(permission.group, [])
      byGroup.get(permission.group).push(permission)
    }
    return [...byGroup.entries()]
  }, [matches])

  if (swrError) {
    return (
      <SectionCard>
        <ErrorState
          title="Couldn't load permissions"
          description="We couldn't reach the server. Check your connection and try again."
          onRetry={() => mutate()}
        />
      </SectionCard>
    )
  }

  if (!data) {
    return (
      <SectionCard>
        <SkeletonList rows={6} />
      </SectionCard>
    )
  }

  if (editing) {
    return (
      <PermissionEditor
        permission={editing}
        onCancel={() => setEditing(null)}
        onSaved={(updated) => {
          mutate(
            (prev) => ({
              ...prev,
              permissions: prev.permissions.map((p) =>
                p.key === updated.key ? { ...p, ...updated } : p
              ),
            }),
            { revalidate: false }
          )
          setEditing(null)
        }}
        toast={toast}
      />
    )
  }

  return (
    <SectionCard
      title="Permissions"
      description="Every capability a role can be given. Reword one to match how your institution talks about it."
    >
      <label className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
          <SearchIcon size={18} />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions"
          aria-label="Search permissions"
          className="w-full rounded-lg border border-input bg-background py-2.5 pr-3 pl-10 text-[15px] font-medium text-foreground transition placeholder:font-normal placeholder:text-muted-foreground hover:border-ring/60 focus:border-brand focus:ring-[3px] focus:ring-ring/25 focus:outline-none"
        />
      </label>

      <div className="mt-5 space-y-6">
        {grouped.length === 0 ? (
          <EmptyState
            icon={ShieldIcon}
            title="No permissions match that search"
            description="Try a different word, or clear the search."
          />
        ) : (
          grouped.map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {group}
              </p>
              <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
                {items.map((permission) => (
                  <li
                    key={permission.key}
                    className="flex items-start gap-3 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{permission.name}</p>
                        {permission.customised && (
                          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand-ink">
                            Reworded
                          </span>
                        )}
                      </div>
                      {permission.description && (
                        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                          {permission.description}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{permission.key}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          'text-xs font-semibold whitespace-nowrap',
                          permission.role_count === 0 ? 'text-chart-refine' : 'text-muted-foreground'
                        )}
                        title={
                          permission.role_count === 0
                            ? 'No role grants this yet'
                            : `Held by: ${permission.roles.join(', ')}`
                        }
                      >
                        {permission.role_count === 0
                          ? 'No roles'
                          : `${permission.role_count} role${permission.role_count === 1 ? '' : 's'}`}
                      </span>

                      <button
                        onClick={() => setEditing(permission)}
                        aria-label={`Edit ${permission.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-ink transition hover:bg-brand/20"
                      >
                        <EditIcon size={17} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  )
}

function PermissionEditor({ permission, onCancel, onSaved, toast }) {
  const [name, setName] = useState(permission.name ?? '')
  const [description, setDescription] = useState(permission.description ?? '')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const { data } = await client.put(`/admin/permissions/${permission.key}`, {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success('Permission updated', { description: 'The new wording is live in the role builder.' })
      onSaved(data)
    } catch (err) {
      const message = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : null
      toast.error('Could not update this permission', { description: message || 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setResetting(true)
    try {
      const { data } = await client.delete(`/admin/permissions/${permission.key}`)
      toast.success('Wording reset', { description: 'This permission is back to its built-in description.' })
      onSaved(data)
    } catch {
      toast.error('Could not reset this permission')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onCancel}
        className="text-sm font-semibold text-brand-ink hover:underline"
      >
        &larr; Back to permissions
      </button>

      <SectionCard
        title="Edit Permission"
        description="Change how this capability is described wherever roles are built."
        action={
          <Button onClick={save} loading={saving} disabled={saving || !name.trim()}>
            Update
          </Button>
        }
      >
        <FieldGrid className="sm:grid-cols-1">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Permission Key</span>
            <p className="rounded-lg border border-input bg-muted px-3 py-2.5 font-mono text-sm text-muted-foreground">
              {permission.key}
            </p>
            {/* Said plainly rather than just disabling the field: an admin who
                cannot see why it is locked will assume it is an oversight. */}
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              Fixed. Every route that guards this capability checks this exact key, so changing it
              would revoke the permission everywhere it is used without anything appearing to break.
            </p>
          </div>

          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={permission.default_name}
          />

          <Textarea
            label="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={permission.default_description ?? ''}
          />
        </FieldGrid>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Held by
          </span>
          {permission.role_count === 0 ? (
            <span className="text-sm font-medium text-chart-refine">No role grants this yet</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {/* A plain chip, not Badge: Badge renders the label for a
                  project status, so a role name passed to it comes out as
                  "Draft". */}
              {permission.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Where the reference design puts "Delete Permission". Deleting one is
          not possible here — the code checks it, so removing it would leave a
          capability nobody could ever be granted. Resetting the wording is the
          equivalent action that is actually safe. */}
      <SectionCard
        title="Reset Wording"
        description="Put this permission back to the name and description the system ships with."
        action={
          <Button
            variant="secondary"
            onClick={reset}
            loading={resetting}
            disabled={resetting || !permission.customised}
          >
            Reset to Default
          </Button>
        }
      >
        <p className="text-sm font-medium text-muted-foreground">
          {permission.customised
            ? `Built-in wording: "${permission.default_name}".`
            : 'This permission still uses its built-in wording, so there is nothing to reset.'}
        </p>
      </SectionCard>
    </div>
  )
}
