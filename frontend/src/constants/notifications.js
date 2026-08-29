import { CheckCircleIcon, ClipboardIcon, FileSpreadsheetIcon, FolderIcon, RefreshCwIcon } from '../components/icons'

// One entry per real notification `kind` the backend actually sends — see
// ProjectDecisionNotification, ProjectAssignedNotification,
// ProjectSubmittedNotification, ProjectResubmittedNotification, and
// DocumentSubmittedNotification. Nothing here should exist without a
// matching backend trigger.
export const NOTIFICATION_KIND_META = {
  approved: {
    title: 'Project Approved',
    icon: CheckCircleIcon,
    variant: 'violet',
    describe: (data) => `Congratulations! Your supervisor has approved "${data.project_title}".`,
    linkFor: () => '/student',
  },
  refine: {
    title: 'Revision Required',
    icon: RefreshCwIcon,
    variant: 'pink',
    describe: (data) => `Your supervisor has requested revisions to "${data.project_title}".`,
    linkFor: () => '/student',
  },
  assigned: {
    title: 'New Project Assigned',
    icon: ClipboardIcon,
    variant: 'blue',
    describe: (data) => `You've been assigned to review "${data.project_title}".`,
    linkFor: (data) => `/assessor/projects/${data.project_id}`,
  },
  resubmitted: {
    title: 'Student Resubmitted Project',
    icon: RefreshCwIcon,
    variant: 'gold',
    describe: (data) => `A revised version of "${data.project_title}" is ready for your review.`,
    linkFor: (data) => `/assessor/projects/${data.project_id}`,
  },
  document_submitted: {
    title: 'Document Submitted',
    icon: FileSpreadsheetIcon,
    variant: 'blue',
    describe: (data) => `${data.document_label} for "${data.project_title}" has been submitted for review.`,
    linkFor: (data) => `/admin/projects/${data.project_id}`,
  },
  submitted: {
    title: 'New Project Submitted',
    icon: FolderIcon,
    variant: 'gold',
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
