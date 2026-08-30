/**
 * How to label a group member, in order of trust:
 *   1. their account name, once they've been imported and linked — always
 *      authoritative over anything a groupmate typed
 *   2. the name the group entered when adding them by Index Number
 *   3. the Index Number itself, if no name was given
 *
 * Kept in one place so every list (student group, assessor, admin, export)
 * labels the same person the same way.
 */
export function memberName(member) {
  return member?.student?.name || member?.name || member?.university_id || 'Unknown'
}

/** True when the member has no account yet, so the label is only a placeholder. */
export function isUnregistered(member) {
  return !member?.student
}
