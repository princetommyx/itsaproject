import { useState } from 'react'
import { Avatar, PageHeading } from './ui'
import SectionLayout, { IdentityHeader, SectionCard } from './SectionLayout'
import PasswordTab from './PasswordTab'
import { useAuth } from '../context/AuthContext'
import { IdCardIcon, LockIcon } from './icons'

/**
 * The shell every role's profile page shares.
 *
 * `extraSections` lets a role add its own — the admin's system overview, an
 * assessor's assigned work — as a real section in the rail rather than a card
 * stacked under the personal details, where it read as an afterthought.
 */
export default function ProfileShell({ subtitle, extraSections = [], children }) {
  const { user } = useAuth()
  const [section, setSection] = useState('profile')

  const sections = [
    { key: 'profile', label: 'Profile', icon: IdCardIcon },
    ...extraSections.map(({ key, label, icon }) => ({ key, label, icon })),
    { key: 'password', label: 'Password', icon: LockIcon },
  ]

  const extra = extraSections.find((s) => s.key === section)

  return (
    <div className="space-y-5">
      {/* No breadcrumb of its own any more — the app bar carries one for every
          page, and two trails saying the same thing is worse than one. */}
      <PageHeading>Profile</PageHeading>

      <SectionLayout
        sections={sections}
        active={section}
        onSelect={setSection}
        aside={
          <SectionCard>
            <IdentityHeader
              avatar={<Avatar name={user?.name} className="h-14 w-14 text-base" />}
              name={user?.name}
              subtitle={user?.role_name || subtitle}
              meta={user?.university_id || user?.email}
            />
          </SectionCard>
        }
      >
        {section === 'password' ? <PasswordTab /> : extra ? extra.content : children}
      </SectionLayout>
    </div>
  )
}
