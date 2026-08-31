import { PageHeading } from '../../../components/ui'
import CsvImportCard from '../../../components/CsvImportCard'

export default function ImportStudents() {
  return (
    <div className="space-y-6">
      <PageHeading>
        Import Students
      </PageHeading>

      <CsvImportCard
        endpoint="/admin/students/import"
        noun="student"
        columns={
          <>
            Columns required: <code className="rounded bg-muted px-1">Student Name</code>,{' '}
            <code className="rounded bg-muted px-1">Index Number</code>,{' '}
            <code className="rounded bg-muted px-1">Email</code>,{' '}
            <code className="rounded bg-muted px-1">Date of Birth</code>. Each student&apos;s date
            of birth as YYYYMMDD becomes their initial password, and they are asked to change it on
            first sign-in.
          </>
        }
      />
    </div>
  )
}
