function formatShort(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'is scheduled'

  return `is on ${date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`
}

// One entry per real notification `kind` the backend actually sends — see
// ProjectDecisionNotification, ProjectAssignedNotification,
// ProjectSubmittedNotification, ProjectResubmittedNotification,
// DocumentSubmittedNotification, AddedToGroupNotification, and
// DefenseScheduledNotification. Nothing here should exist without a
// matching backend trigger — describeNotification drops any kind that has
// no entry, so a new backend notification is invisible until it's listed.
//
// No per-kind icon or colour here anymore — every row in the list renders
// with the same icon (see NotificationsPage), so title/description is what
// tells one kind of notification from another, the way the reference this
// was redesigned from does it.
export const NOTIFICATION_KIND_META = {
  approved: {
    title: 'Project Approved',
    describe: (data) => `Congratulations! Your supervisor has approved "${data.project_title}".`,
    linkFor: () => '/student',
  },
  refine: {
    title: 'Revision Required',
    describe: (data) => `Your supervisor has requested revisions to "${data.project_title}".`,
    linkFor: () => '/student',
  },
  assigned: {
    title: 'New Project Assigned',
    describe: (data) => `You've been assigned to review "${data.project_title}".`,
    linkFor: (data) => `/assessor/projects/${data.project_id}`,
  },
  resubmitted: {
    title: 'Student Resubmitted Project',
    describe: (data) => `A revised version of "${data.project_title}" is ready for your review.`,
    linkFor: (data) => `/assessor/projects/${data.project_id}`,
  },
  document_submitted: {
    title: 'Document Submitted',
    describe: (data) => `${data.document_label} for "${data.project_title}" has been submitted for review.`,
    linkFor: (data) => `/admin/projects/${data.project_id}`,
  },
  added_to_group: {
    title: 'Added to a Project Group',
    describe: (data) => `An administrator has added you to the group working on "${data.project_title}".`,
    linkFor: () => '/student',
  },
  defense_scheduled: {
    title: 'Defense Scheduled',
    describe: (data) => {
      const dates = [
        data.proposal_defense_at && `proposal defense ${formatShort(data.proposal_defense_at)}`,
        data.final_defense_at && `project defense ${formatShort(data.final_defense_at)}`,
      ].filter(Boolean)

      return `Your ${dates.join(', and ')} for "${data.project_title}".`
    },
    linkFor: () => '/student',
  },
  submitted: {
    title: 'New Project Submitted',
    describe: (data) => `"${data.project_title}" has been submitted and needs an assessor assigned.`,
    linkFor: () => '/admin/assignments',
  },
}

export function describeNotification(notification) {
  const meta = NOTIFICATION_KIND_META[notification.data?.kind]
  if (!meta) return null
  return {
    ...meta,
    title: meta.title,
    description: meta.describe(notification.data),
    link: meta.linkFor(notification.data),
  }
}
