import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

export default function LoginChoice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-upsa-blue text-lg font-bold text-white">
            U
          </div>
          <h1 className="text-lg font-semibold text-slate-800">UPSA Final Year Project Portal</h1>
          <p className="text-sm text-slate-500">Choose how you'd like to sign in</p>
        </div>

        <div className="space-y-3">
          <Link
            to="/login/student"
            className="block rounded-md border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-upsa-blue hover:text-upsa-blue"
          >
            I'm a Student
          </Link>
          <Link
            to="/login/staff"
            className="block rounded-md border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-upsa-blue hover:text-upsa-blue"
          >
            I'm Staff / Admin
          </Link>
        </div>
      </Card>
    </div>
  )
}
