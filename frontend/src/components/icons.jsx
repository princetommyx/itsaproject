const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function DashboardIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function ClipboardIcon() {
  return (
    <svg {...base}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16.5 5.5a3 3 0 0 1 0 5.6" />
      <path d="M21 21v-1a5.5 5.5 0 0 0-4-5.3" />
    </svg>
  )
}

export function BuildingIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="3" width="10" height="18" rx="1" />
      <rect x="14" y="9" width="6" height="12" rx="1" />
      <path d="M7 7h.01M11 7h.01M7 11h.01M11 11h.01M7 15h.01M11 15h.01" />
    </svg>
  )
}

export function LogIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 13h6M7 16h4" />
    </svg>
  )
}

export function MessageIcon() {
  return (
    <svg {...base}>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  )
}

export function FolderIcon() {
  return (
    <svg {...base}>
      <path d="M3 6a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
    </svg>
  )
}

export function UploadCloudIcon() {
  return (
    <svg {...base}>
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 8.06 4 4 0 0 1 17 16" />
      <path d="M12 12v7" />
      <path d="M9.5 14.5 12 12l2.5 2.5" />
    </svg>
  )
}

export function FileSpreadsheetIcon() {
  return (
    <svg {...base}>
      <path d="M6 2h9l4 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M15 2v4h4" />
      <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg {...base}>
      <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function UserCircleIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.2 18.5a6 6 0 0 1 11.6 0" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg {...base}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function LogOutIcon() {
  return (
    <svg {...base}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function CheckCircleIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5.5" />
    </svg>
  )
}

export function RefreshCwIcon() {
  return (
    <svg {...base}>
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg {...base}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg {...base}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.5 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1" />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export function InboxIcon() {
  return (
    <svg {...base}>
      <path d="M3 12h4.5l1.5 3h6l1.5-3H21" />
      <path d="M5.5 6h13l2.5 6v7a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19v-7Z" />
    </svg>
  )
}
