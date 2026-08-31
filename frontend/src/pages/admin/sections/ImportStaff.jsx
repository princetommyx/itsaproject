import { PageHeading } from '../../../components/ui'
import CsvImportCard from '../../../components/CsvImportCard'

export default function ImportStaff() {
  return (
    <div className="space-y-6">
      <PageHeading description="Bulk-create assessor and administrator accounts from a CSV list, instead of adding them one at a time.">
        Import Staff
      </PageHeading>

      <CsvImportCard
        endpoint="/admin/staff/import"
        noun="staff account"
        columns={
          <>
            Columns required: <code className="rounded bg-muted px-1">Staff Name</code>,{' '}
            <code className="rounded bg-muted px-1">Email</code>,{' '}
            <code className="rounded bg-muted px-1">Role</code>,{' '}
            <code className="rounded bg-muted px-1">Date of Birth</code>. Role must be{' '}
            <code className="rounded bg-muted px-1">assessor</code> or{' '}
            <code className="rounded bg-muted px-1">admin</code>. Staff sign in with their official
            email, and their date of birth as YYYYMMDD is the initial password — they are asked to
            change it before they can use the system.
          </>
        }
      />
    </div>
  )
}
