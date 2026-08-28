export default function AuthField({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm text-slate-500">{label}</span>
      <input
        className="-mx-2 w-full rounded-md border-0 border-b-2 border-slate-300 bg-transparent px-2 py-2 text-slate-800 transition duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-upsa-blue focus:bg-blue-50/60 focus:outline-none"
        {...props}
      />
    </label>
  )
}
